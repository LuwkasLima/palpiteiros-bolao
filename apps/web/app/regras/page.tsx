"use client";

import { useEffect, useState } from "react";

type Tab = "v1" | "v2" | "ko";

export default function RegrasPage() {
  const [tab, setTab] = useState<Tab>("v2");

  // Deep link from the "mata-mata" notification lands directly on that tab.
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#mata-mata") {
      setTab("ko");
    }
  }, []);

  // Knockout matches are scored with the Rodada 2 base tiers.
  const showV2Tiers = tab === "v2" || tab === "ko";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Como funciona a pontuação</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Cada palpite vale pontos de acordo com o quão certo você chegou — e os jogos do mata-mata valem muito mais.
        </p>
      </div>

      <nav className="flex gap-1">
        <button
          className={`btn px-4 py-2 text-sm ${tab === "v1" ? "" : "btn-ghost"}`}
          onClick={() => setTab("v1")}
        >
          Rodada 1
        </button>
        <button
          className={`btn px-4 py-2 text-sm ${tab === "v2" ? "" : "btn-ghost"}`}
          onClick={() => setTab("v2")}
        >
          Rodada 2
        </button>
        <button
          className={`btn px-4 py-2 text-sm ${tab === "ko" ? "" : "btn-ghost"}`}
          onClick={() => setTab("ko")}
        >
          Mata-mata
        </button>
      </nav>

      {/* Base tiers — apply to every match (knockout uses the Rodada 2 tiers) */}
      <section>
        <h2 className="mb-3 font-bold text-[var(--accent-2)]">Palpite de placar</h2>
        <div className="card divide-y divide-[var(--border)]">
          <TierRow
            label="Placar exato"
            pts={5}
            pred="3 × 1"
            actual="3 × 1"
            note="Acertou o placar na mosca"
            highlight
          />
          {showV2Tiers && (
            <TierRow
              label="Quase exato"
              pts={4}
              pred="4 × 1"
              actual="3 × 1"
              note="Um lado exato, o outro errado por 1 gol"
            />
          )}
          <TierRow
            label="Diferença certa"
            pts={3}
            pred="2 × 0"
            actual="3 × 1"
            note="Mesma diferença de gols, placar diferente"
          />
          <TierRow
            label="Só o resultado"
            pts={2}
            pred="1 × 0"
            actual="3 × 1"
            note="Acertou quem ganhou, errou a diferença"
          />
          <TierRow
            label="Errou"
            pts={0}
            pred="1 × 3"
            actual="3 × 1"
            note="Resultado errado"
            muted
          />
        </div>
        {showV2Tiers ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Empates: valem 4 pts se o erro for de exatamente 1 gol por lado (ex: 0×0 previsto, 1×1 real) — não existe nível de 3 pts. Erro maior vale 2 pts.
          </p>
        ) : (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Empates nunca chegam ao nível de "diferença certa" — qualquer empate com placar diferente vale 2 pts.
          </p>
        )}
        {tab !== "ko" && (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Na fase de grupos cada jogo vale ×1. Os multiplicadores entram no <button onClick={() => setTab("ko")} className="font-medium text-[var(--accent)] underline underline-offset-2">mata-mata</button>.
          </p>
        )}
      </section>

      {tab === "ko" && (
        <>
          {/* The reasoning behind the knockout scoring */}
          <section className="card p-4">
            <h2 className="font-bold text-[var(--accent-2)]">⚽ Como funciona o mata-mata</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              A pontuação-base é a mesma da Rodada 2, mas cada fase vale mais que a anterior. A partir das quartas de final, duas coisas mudaram — e aqui está o porquê de cada uma.
            </p>

            <p className="mt-3 text-sm font-semibold">1. Pesos das fases finais mais equilibrados</p>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              Antes, quartas, semi e final multiplicavam demais a pontuação — um único palpite certeiro na final podia virar o campeonato de cabeça pra baixo e apagar meses de consistência. Agora os pesos são mais equilibrados: acertar a final continua valendo muito, mas não vale mais do que uma campanha inteira bem feita. Quem foi consistente desde a fase de grupos fica mais protegido.
            </p>

            <p className="mt-3 text-sm font-semibold">2. O placar exato continua valendo 5 pts</p>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              Muita gente pediu para o placar exato valer mais que o "quase" ou a diferença. Testamos com os dados reais de todos os bolões e o efeito seria o contrário do que a gente quer: aumentaria a distância entre o líder e o lanterna e deixaria a disputa decidida cedo demais. Queremos bolão vivo até o último jogo — todo mundo com chance de subir no ranking até a final.
            </p>

            <p className="mt-3 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
              <span className="font-semibold text-[var(--text)]">Importante:</span> nada disso é retroativo. Todos os pontos que você já fez continuam valendo igual — as mudanças valem só para os jogos a partir das quartas.
            </p>
          </section>

          {/* Round weight */}
          <section>
            <h2 className="mb-3 font-bold text-[var(--accent-2)]">Multiplicador por fase</h2>
            <div className="card divide-y divide-[var(--border)]">
              {[
                { fase: "Fase de grupos", mult: "×1" },
                { fase: "16-avos", mult: "×2" },
                { fase: "Oitavas", mult: "×3" },
                { fase: "Quartas de final", mult: "×4", changed: true },
                { fase: "Semifinal", mult: "×5", changed: true },
                { fase: "3º lugar / Final", mult: "×6", changed: true },
              ].map(({ fase, mult, changed }) => (
                <div key={fase} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span>
                    {fase}
                    {changed && <span className="ml-2 text-xs text-[var(--muted)]">(reduzido)</span>}
                  </span>
                  <span className="font-bold text-[var(--accent)]">{mult}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              As fases finais ainda valem mais, mas com pesos mais equilibrados: a consistência ao longo do torneio conta tanto quanto uma boa tacada no fim.
            </p>
          </section>

          {/* Advance bonus */}
          <section>
            <h2 className="mb-3 font-bold text-[var(--accent-2)]">Bônus: classificado correto</h2>
            <div className="card p-4">
              <p className="text-sm text-[var(--muted)]">
                Em todos os jogos do mata-mata você também palpita quem avança. Acertar vale +2 × multiplicador, independentemente do placar.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <ExamplePill pred="Errou placar + acertou classificado (QF)" note="+8 pts só pelo classificado" />
              </div>
            </div>
          </section>

          {/* Worked examples */}
          <section>
            <h2 className="mb-3 font-bold text-[var(--accent-2)]">Exemplos no mata-mata</h2>
            <div className="flex flex-col gap-3">
              <KoExample
                fase="Quartas de final"
                mult="×4"
                pred="2 × 1"
                actual="2 × 1"
                result="Placar exato → 5 × 4 = 20 pts"
                bonus="+8 se também acertou quem avançou (28 no total)"
              />
              <KoExample
                fase="Semifinal"
                mult="×5"
                pred="2 × 1"
                actual="2 × 0"
                result="Quase exato (errou 1 gol) → 4 × 5 = 20 pts"
              />
              <KoExample
                fase="Quartas de final"
                mult="×4"
                pred="1 × 0"
                actual="0 × 2"
                result="Errou o placar → 0 pts pelo placar"
                bonus="mas acertou o classificado: +2 × 4 = 8 pts"
              />
              <KoExample
                fase="Final"
                mult="×6"
                pred="1 × 0"
                actual="1 × 0"
                result="Placar exato → 5 × 6 = 30 pts"
                bonus="+12 pelo classificado (42 no total)"
              />
            </div>
          </section>

          {/* Quick summary */}
          <section className="card p-4">
            <p className="text-sm font-semibold text-[var(--accent-2)]">Máximo possível por jogo</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {[
                { fase: "Fase de grupos", max: "5 pts" },
                { fase: "Quartas de final", max: "28 pts" },
                { fase: "Final", max: "42 pts" },
              ].map(({ fase, max }) => (
                <div key={fase} className="flex flex-col items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2">
                  <span className="text-[var(--muted)]">{fase}</span>
                  <span className="text-lg font-extrabold text-[var(--accent)]">{max}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Placar exato + classificado certo, com o multiplicador da fase.
            </p>
          </section>
        </>
      )}

      {/* Clean-sheet bonus — Rodada 1 only */}
      {tab === "v1" && (
        <section>
          <h2 className="mb-3 font-bold text-[var(--accent-2)]">Bônus: goleiro em branco</h2>
          <div className="card p-4">
            <p className="text-sm text-[var(--muted)]">
              Previu 0 gols para um lado e o time realmente não marcou? Vale +1 × multiplicador por lado. Soma em cima do nível de placar acertado.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <ExamplePill pred="0 × 0" actual="0 × 0" note="+2 pts (dois lados)" />
              <ExamplePill pred="0 × 1" actual="0 × 2" note="+1 pt (lado esquerdo)" />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function TierRow({
  label,
  pts,
  pred,
  actual,
  note,
  highlight,
  muted,
}: {
  label: string;
  pts: number;
  pred: string;
  actual: string;
  note: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div
        className="w-8 shrink-0 text-center text-lg font-extrabold"
        style={{ color: muted ? "var(--muted)" : highlight ? "var(--accent)" : "var(--text)" }}
      >
        {pts}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-[var(--muted)]">{note}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-xs">
        <ScoreChip label={pred} dim />
        <span className="text-[var(--muted)]">→</span>
        <ScoreChip label={actual} />
      </div>
    </div>
  );
}

function ScoreChip({ label, dim }: { label: string; dim?: boolean }) {
  return (
    <span className="chip" style={dim ? { opacity: 0.6 } : undefined}>
      {label}
    </span>
  );
}

function ExamplePill({ pred, actual, note }: { pred: string; actual?: string; note: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1">
      {pred && <span className="chip">{pred}</span>}
      {actual && (
        <>
          <span className="text-[var(--muted)]">→</span>
          <span className="chip">{actual}</span>
        </>
      )}
      <span className="text-[var(--muted)]">{note}</span>
    </div>
  );
}

function KoExample({
  fase,
  mult,
  pred,
  actual,
  result,
  bonus,
}: {
  fase: string;
  mult: string;
  pred: string;
  actual: string;
  result: string;
  bonus?: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--accent-2)]">{fase}</span>
        <span className="text-xs font-bold text-[var(--accent)]">{mult}</span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs">
        <ScoreChip label={pred} dim />
        <span className="text-[var(--muted)]">→</span>
        <ScoreChip label={actual} />
      </div>
      <p className="mt-2 text-sm font-semibold">{result}</p>
      {bonus && <p className="mt-0.5 text-xs text-[var(--muted)]">{bonus}</p>}
    </div>
  );
}
