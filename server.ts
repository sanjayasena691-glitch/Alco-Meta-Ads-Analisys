import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'ALCO Meta Ads Analyst API' });
  });

    // AI Diagnosis API Endpoint (Server-Side Gemini)
  app.post('/api/ai/analyze', async (req, res) => {
    try {
      const { 
        entityName, 
        entityType, 
        metrics, 
        previousMetrics, 
        evaluation, 
        targets, 
        userCustomQuestion,
        landingPageMetrics,
        landingPageEvaluation,
        funnelEvaluation 
      } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      const fallbackWhere = funnelEvaluation?.bottleneckTitle 
        || (evaluation?.primaryIssue?.includes('Landing Page') ? 'Landing Page' : 'Meta Ads Campaign');

      const formatVal = (val: number | null | undefined, prefix = '', suffix = '') => {
        if (val === null || val === undefined || isNaN(val)) return 'Tidak tersedia (N/A)';
        return `${prefix}${val.toLocaleString('id-ID')}${suffix}`;
      };

      if (!apiKey) {
        // Fallback response if no key configured in environment
        return res.json({
          entityName: entityName || 'Selected Entity',
          entityType: entityType || 'Campaign',
          whereTheProblemIs: fallbackWhere,
          whatHappened: funnelEvaluation?.headlineSummary 
            || `Analisis metrik terstruktur mendeteksi status ${evaluation?.status || 'Active'}.`,
          possibleCause: funnelEvaluation?.detailedReason 
            || evaluation?.primaryIssue 
            || 'Fluktuasi wajar delivery algoritma Meta Ads.',
          evidence: funnelEvaluation?.evidence 
            || evaluation?.signals?.flatMap((s: any) => s.evidence) 
            || [
              `Spend: ${formatVal(metrics?.spend, 'Rp')}`,
              `ROAS: ${formatVal(metrics?.roas, '', 'x')}`,
            ],
          recommendedAction: funnelEvaluation?.recommendedAction || evaluation?.recommendedAction || 'Pantau performa selama 24 jam ke depan.',
          dontDoYet: funnelEvaluation?.dontDoYet || evaluation?.dontDoYet || 'Jangan merubah audience dan creative bersamaan.',
          confidence: funnelEvaluation?.confidence || evaluation?.confidence || 'Medium',
          generatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          source: 'rule_engine',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const promptContext = `
Anda adalah AI Meta Ads & Funnel Analyst senior di ALCO, spesialis mendampingi pemilik bisnis dan advertiser.
Tugas Anda BUKAN menghitung ulang metrik, melainkan MENJELASKAN hasil analisis deterministik dari Funnel Diagnosis Engine dan Landing Page Rule Engine dengan bahasa yang jelas, empatik, dan actionable.

Pedoman Keselamatan AI:
1. JANGAN menghitung ulang angka/metrik. Gunakan angka persis yang telah dihitung oleh Rule Engine di bawah.
2. JANGAN PERNAH mengarang metrik yang belum terukur (misal jika Landing Page Views, Frequency, atau CPA berstatus "Tidak tersedia (N/A)", jelaskan sebagai data belum terlacak / N/A, BUKAN 0% dan BUKAN angka estimasi buatan).
3. Jangan membuat klaim absolut. Gunakan kalimat objektif seperti "Berdasarkan data...", "Indikasi ... terkonfirmasi oleh...".
4. Resolusi Konflik: Jika primary bottleneck adalah Landing Page (Technical / Content Mismatch), tegaskan bahwa masalahnya bukan di materi iklan Meta. Jangan membuat pengguna bingung.
5. Jika status data INSUFFICIENT_DATA atau metrik bernilai N/A, WAJIB peringatkan untuk tidak mengubah campaign sebelum data terkumpul.
6. Bahasa: Bahasa Indonesia profesional, ringkas, dan mudah dimengerti pemula.

Hasil Diagnosis Deterministik Funnel:
- Primary Bottleneck: ${funnelEvaluation?.primaryBottleneck || funnelEvaluation?.mainBottleneck || '-'}
- Secondary Issue: ${funnelEvaluation?.secondaryIssue || 'Tidak ada isu sekunder'}
- Judul Diagnosis: ${funnelEvaluation?.bottleneckTitle || '-'}
- Tingkat Keyakinan (Confidence): ${funnelEvaluation?.confidence || 'Medium'}
- Rekomendasi Rule Engine: ${funnelEvaluation?.recommendedAction || '-'}
- Larangan Tindakan Cepat: ${funnelEvaluation?.dontDoYet || '-'}
- Bukti Terverifikasi: ${(funnelEvaluation?.evidence || []).join('; ')}

Informasi Entitas:
- Nama: ${entityName} (${entityType})
- Status: ${evaluation?.status || 'Active'}

Target Bisnis Pengguna:
- Nama Produk: ${targets?.productName || 'Produk'}
- Harga: ${formatVal(targets?.productPrice, 'Rp')}
- Target CPA: ${formatVal(targets?.targetCpa, 'Rp')}
- Break-Even CPA: ${formatVal(targets?.breakEvenCpa, 'Rp')}
- Target ROAS: ${formatVal(targets?.targetRoas, '', 'x')}
- Target CTR: ${formatVal(targets?.targetCtr, '', '%')}

Metrik Meta Ads Saat Ini (Adheres to Zero-Fabrication):
- Spend: ${formatVal(metrics?.spend, 'Rp')}
- Revenue: ${formatVal(metrics?.revenue, 'Rp')}
- Purchases: ${metrics?.purchases !== null && metrics?.purchases !== undefined ? metrics.purchases : 'Tidak tersedia (N/A)'}
- ROAS: ${formatVal(metrics?.roas, '', 'x')}
- CPA: ${formatVal(metrics?.cpa, 'Rp')}
- CTR: ${formatVal(metrics?.ctr, '', '%')}
- CPC: ${formatVal(metrics?.cpc, 'Rp')}
- CPM: ${formatVal(metrics?.cpm, 'Rp')}
- Frequency: ${formatVal(metrics?.frequency)}
- Link Clicks: ${metrics?.linkClicks !== null && metrics?.linkClicks !== undefined ? metrics.linkClicks : 'Tidak tersedia (N/A)'}

${previousMetrics ? `
Perbandingan Periode Sebelumnya:
- Spend Lalu: ${formatVal(previousMetrics?.spend, 'Rp')}
- ROAS Lalu: ${formatVal(previousMetrics?.roas, '', 'x')}
- CPA Lalu: ${formatVal(previousMetrics?.cpa, 'Rp')}
- CTR Lalu: ${formatVal(previousMetrics?.ctr, '', '%')}
- CPC Lalu: ${formatVal(previousMetrics?.cpc, 'Rp')}
` : ''}

${landingPageMetrics ? `
Metrik Landing Page (Microsoft Clarity):
- Total Sesi: ${landingPageMetrics.sessions}
- Rata-rata Kedalaman Scroll: ${landingPageMetrics.avgScrollDepth}%
- Rata-rata Waktu Keterlibatan: ${landingPageMetrics.avgEngagementTime} detik
- Quick Backs (< 5 detik): ${landingPageMetrics.quickBacks}
- Rage Clicks: ${landingPageMetrics.rageClicks}
- Dead Clicks: ${landingPageMetrics.deadClicks}
- Script Errors: ${landingPageMetrics.scriptErrors}
- Skor Kesehatan LP: ${landingPageEvaluation?.healthScore || 0}/100
` : ''}

${userCustomQuestion ? `Pertanyaan Spesifik Pengguna: "${userCustomQuestion}"` : ''}

Keluarkan format JSON dengan struktur yang persis:
- whatHappened: string (penjelasan singkat situasi saat ini)
- primaryBottleneck: string (masalah utama yang harus diperbaiki pertama)
- secondaryIssue: string or null (masalah sekunder jika ada)
- whereTheProblemIs: string (letak area masalah)
- why: string (alasan mendalam mengapa hal ini terjadi)
- possibleCause: string (ringkasan penyebab)
- evidence: string[] (daftar 3-4 poin angka metrik pendukung)
- confidence: "Low" | "Medium" | "High"
- recommendedAction: string (tindakan perbaikan prioritas)
- dontDoYet: string (tindakan yang jangan dilakukan saat ini)
- nextThingToMonitor: string (metrik atau event yang perlu dipantau selanjutnya)
`;

      let response: any;
      const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-pro-preview'];
      const generateConfig = {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            whatHappened: { type: Type.STRING },
            primaryBottleneck: { type: Type.STRING },
            secondaryIssue: { type: Type.STRING },
            whereTheProblemIs: { type: Type.STRING },
            why: { type: Type.STRING },
            possibleCause: { type: Type.STRING },
            evidence: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            confidence: { type: Type.STRING },
            recommendedAction: { type: Type.STRING },
            dontDoYet: { type: Type.STRING },
            nextThingToMonitor: { type: Type.STRING },
          },
          required: [
            'whatHappened', 
            'primaryBottleneck', 
            'whereTheProblemIs', 
            'why', 
            'possibleCause', 
            'evidence', 
            'confidence', 
            'recommendedAction', 
            'dontDoYet', 
            'nextThingToMonitor'
          ],
        },
      };

      for (const modelName of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: promptContext,
            config: generateConfig,
          });
          if (response?.text) {
            break;
          }
        } catch (modelErr: any) {
          // If a model is unavailable or rate-limited, attempt the next candidate
          continue;
        }
      }

      if (!response?.text) {
        throw new Error('No response generated from Gemini models');
      }

      const parsed = JSON.parse(response.text || '{}');
      return res.json({
        entityName,
        entityType,
        ...parsed,
        source: 'gemini',
        generatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      });
    } catch {
      // Return safe, high-confidence fallback calculated from funnel and rule evaluation
      const primaryB = req.body?.funnelEvaluation?.primaryBottleneck || req.body?.funnelEvaluation?.mainBottleneck || 'HEALTHY';
      return res.status(200).json({
        entityName: req.body?.entityName || 'Campaign',
        entityType: req.body?.entityType || 'Campaign',
        whatHappened: req.body?.funnelEvaluation?.headlineSummary || req.body?.evaluation?.primaryIssue || 'Analisis metrik terstruktur dari data Meta Ads & Landing Page.',
        primaryBottleneck: primaryB,
        secondaryIssue: req.body?.funnelEvaluation?.secondaryIssue || null,
        whereTheProblemIs: req.body?.funnelEvaluation?.bottleneckTitle || 'Meta Ads & Landing Page',
        why: req.body?.funnelEvaluation?.detailedReason || 'Data menunjukkan fluktuasi lelang atau friksi pada alur konversi.',
        possibleCause: req.body?.funnelEvaluation?.detailedReason || 'Data menunjukkan fluktuasi lelang atau friksi pada alur konversi.',
        evidence: req.body?.funnelEvaluation?.evidence || req.body?.evaluation?.signals?.[0]?.evidence || [
          `Spend: Rp${(req.body?.metrics?.spend || 0).toLocaleString('id-ID')}`,
          `ROAS: ${req.body?.metrics?.roas || 0}x`,
        ],
        confidence: req.body?.funnelEvaluation?.confidence || req.body?.evaluation?.confidence || 'High',
        recommendedAction: req.body?.funnelEvaluation?.recommendedAction || req.body?.evaluation?.recommendedAction || 'Pantau metrik utama selama 24 jam ke depan.',
        dontDoYet: req.body?.funnelEvaluation?.dontDoYet || req.body?.evaluation?.dontDoYet || 'Jangan ubah audience dan creative secara serentak.',
        nextThingToMonitor: 'Pantau kestabilan konversi dan fluktuasi CPA selama 24 - 48 jam ke depan.',
        generatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        source: 'rule_engine',
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ALCO Meta Ads Analyst server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
