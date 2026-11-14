export interface FightInput {
  atkTroops: number;
  atkCommand: number;
  atkMorale: number;
  defTroops: number;
  defCommand: number;
  defMorale: number;
  walled: boolean;
  defMod?: number;
}

export interface FightResult {
  atkLoss: number;
  defLoss: number;
  atkLeft: number;
  defLeft: number;
  takes: boolean;
}

/**
 * 公开、确定的战果。没有随机数，因此也没有可供暗改的概率。
 * 攻方强度 = 兵力 × (0.55 + 统率/40) × 士气%
 * 守方额外 × 1.25（城墙），再乘开门等修正。
 * 损失率 = 0.12 + 0.4 × 对方强度占比。
 * 攻方剩余兵力多于守方，且攻方强度高于守方的 0.85 倍，才算破城。
 */
export function fight(input: FightInput): FightResult {
  const atkS =
    input.atkTroops *
    (0.55 + input.atkCommand / 40) *
    (input.atkMorale / 100);
  const defS =
    input.defTroops *
    (0.55 + input.defCommand / 40) *
    (input.defMorale / 100) *
    (input.walled ? 1.25 : 1) *
    (input.defMod ?? 1);
  const ratio = atkS + defS <= 0 ? 0.5 : atkS / (atkS + defS);
  const atkLoss = Math.min(
    input.atkTroops,
    Math.round(input.atkTroops * (0.12 + 0.4 * (1 - ratio))),
  );
  const defLoss = Math.min(
    input.defTroops,
    Math.round(input.defTroops * (0.12 + 0.4 * ratio)),
  );
  const atkLeft = input.atkTroops - atkLoss;
  const defLeft = input.defTroops - defLoss;
  const takes = atkLeft > defLeft && atkS > defS * 0.85 && atkLeft > 0;
  return { atkLoss, defLoss, atkLeft, defLeft, takes };
}
