export default function RegrasPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Como funciona a pontuação</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Cada palpite vale pontos de acordo com o quão certo você chegou — e os jogos do mata-mata valem muito mais.
        </p>
      </div>

      {/* Base tiers */}
      <section>
        <h2 className="mb-3 font-bold text-[var(--accent-2)]">Palpite de placar</h2>
        <div className="card divide-y divide-[var(--border)]">
          <TierRow
            label="Placar exato"
            pts={5}
            pred="2 × 1"
            actual="2 × 1"
            note="Acertou o placar na mosca"
            highlight
          />
          <TierRow
            label="Placar próximo"
            pts={3}
            pred="1 × 0"
            actual="2 × 0"
            note="Um lado exato, o outro errado por 1 gol"
          />
          <TierRow
            label="Só o resultado"
            pts={2}
            pred="2 × 0"
            actual="1 × 0"
            note="Acertou quem ganhou, errou a diferença"
          />
          <TierRow
            label="Errou"
            pts={0}
            pred="1 × 0"
            actual="0 × 1"
            note="Resultado errado"
            muted
          />
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Empates: valem 3 pts se o erro for de exatamente 1 gol por lado (ex: 1×1 previsto, 2×2 real). Erro maior vale 2 pts.
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
            { fase: "Quartas de final", mult: "×5" },
            { fase: "Semifinal", mult: "×8" },
            { fase: "3º lugar / Final", mult: "×13" },
          ].map(({ fase, mult }) => (
            <div key={fase} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{fase}</span>
              <span className="font-bold text-[var(--accent)]">{mult}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Um placar exato na final vale 65 pts — dá para virar o bolão mesmo perto do fim.
        </p>
      </section>

      {/* Bonuses */}
      <section>
        <h2 className="mb-3 font-bold text-[var(--accent-2)]">Bônus</h2>
        <div className="flex flex-col gap-3">
          <div className="card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">Goleiro em branco</p>
                <p className="mt-0.5 text-sm text-[var(--muted)]">
                  +1 × multiplicador para cada time que você previu não tomar gol e de fato não tomou.
                  Pode ganhar até 2 bônus por jogo (um por lado). Só vale se o resultado geral estiver certo.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <ExamplePill pred="0 × 2" actual="0 × 3" note="+1 bônus (mandante em branco)" />
                  <ExamplePill pred="0 × 0" actual="0 × 0" note="+2 bônus (placar exato + ambos em branco)" />
                </div>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">Classificado correto</p>
                <p className="mt-0.5 text-sm text-[var(--muted)]">
                  Disponível nos jogos do mata-mata. Acertar quem avança vale +2 × multiplicador,
                  independentemente do placar.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <ExamplePill pred="Errou placar + acertou classificado (QF)" actual="" note="+10 pts só pelo classificado" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick summary */}
      <section className="card p-4">
        <p className="text-sm font-semibold text-[var(--accent-2)]">Máximo possível por jogo</p>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          {[
            { fase: "Fase de grupos", max: "7 pts" },
            { fase: "Quartas de final", max: "45 pts" },
            { fase: "Final", max: "117 pts" },
          ].map(({ fase, max }) => (
            <div key={fase} className="flex flex-col items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2">
              <span className="text-[var(--muted)]">{fase}</span>
              <span className="text-lg font-extrabold text-[var(--accent)]">{max}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Placar exato + 2 goleiros em branco + classificado certo, com o multiplicador máximo.
        </p>
      </section>
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
    <span
      className="chip"
      style={dim ? { opacity: 0.6 } : undefined}
    >
      {label}
    </span>
  );
}

function ExamplePill({ pred, actual, note }: { pred: string; actual: string; note: string }) {
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
