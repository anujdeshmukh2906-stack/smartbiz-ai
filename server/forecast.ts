import type { State } from "./domain.ts";
const iso = (date: Date) => date.toISOString().slice(0, 10);
const offset = (date: string, n: number) =>
  iso(new Date(Date.parse(date + "T00:00:00Z") + n * 86400000));
const weekday = (date: string) => new Date(date + "T00:00:00Z").getUTCDay();
const average = (v: number[]) =>
  v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
// Shrink weekday estimates toward the global mean to avoid overfitting sparse histories.
function fit(rows: { date: string; qty: number }[]) {
  const mean = average(rows.map((r) => r.qty));
  return {
    mean,
    weekdays: Array.from({ length: 7 }, (_, d) => {
      const values = rows
        .filter((r) => weekday(r.date) === d)
        .map((r) => r.qty);
      return (
        (values.reduce((a, b) => a + b, 0) + 2 * mean) / (values.length + 2)
      );
    }),
  };
}
export function forecast(s: State, productId: string, asOf = iso(new Date())) {
  const sales = s.events.filter(
    (e) =>
      (e.type === "sale" || e.type === "sale-return") &&
      e.at.slice(0, 10) < asOf &&
      e.at.slice(0, 10) >= offset(asOf, -28),
  );
  const rows = Array.from({ length: 28 }, (_, i) => {
    const date = offset(asOf, i - 28);
    return {
      date,
      qty: Math.max(
        0,
        sales
          .filter((e) => e.at.slice(0, 10) === date)
          .flatMap((e) =>
            e.lines.map((l) => ({
              ...l,
              sign: e.type === "sale-return" ? -1 : 1,
            })),
          )
          .filter((l) => l.productId === productId)
          .reduce((a, l) => a + l.qty * l.sign, 0),
      ),
    };
  });
  const train = rows.slice(0, 21),
    test = rows.slice(21),
    validation = fit(train),
    baselineMae = average(test.map((r) => Math.abs(r.qty - validation.mean))),
    weekdayMae = average(
      test.map((r) => Math.abs(r.qty - validation.weekdays[weekday(r.date)])),
    ),
    observedDays = new Set(
      sales
        .filter((e) => e.lines.some((l) => l.productId === productId))
        .map((e) => e.at.slice(0, 10)),
    ).size;
  const model =
    observedDays >= 14 && weekdayMae < baselineMae * 0.95
      ? "weekday-shrinkage"
      : "trailing-mean";
  const fitted = fit(rows),
    mae = model === "weekday-shrinkage" ? weekdayMae : baselineMae;
  const future = Array.from({ length: 30 }, (_, i) => {
    const date = offset(asOf, i),
      prediction =
        model === "weekday-shrinkage"
          ? fitted.weekdays[weekday(date)]
          : fitted.mean;
    return {
      date,
      units: Number(prediction.toFixed(2)),
      low: Math.max(0, Number((prediction - 2 * mae).toFixed(2))),
      high: Number((prediction + 2 * mae).toFixed(2)),
    };
  });
  return {
    productId,
    model,
    observedDays,
    dailyMean: average(future.slice(0, 7).map((r) => r.units)),
    next7: Math.ceil(future.slice(0, 7).reduce((a, r) => a + r.units, 0)),
    next30: Math.ceil(future.reduce((a, r) => a + r.units, 0)),
    mae: Number(mae.toFixed(2)),
    baselineMae: Number(baselineMae.toFixed(2)),
    wape: test.reduce((a, r) => a + r.qty, 0)
      ? Number(
          (
            ((mae * test.length) / test.reduce((a, r) => a + r.qty, 0)) *
            100
          ).toFixed(1),
        )
      : null,
    future,
    history: rows,
    explanation:
      observedDays < 14
        ? "Limited history: conservative mean fallback. No evidence for a seasonal model yet."
        : model === "weekday-shrinkage"
          ? "Fitted weekday effects beat the mean by at least 5% on a 7-day chronological holdout."
          : "The simpler mean performed as well or better on the holdout.",
    uncertainty:
      "Low/high are heuristic ±2 MAE bands, not calibrated confidence intervals. Recorded sales can understate demand during stockouts.",
  };
}
