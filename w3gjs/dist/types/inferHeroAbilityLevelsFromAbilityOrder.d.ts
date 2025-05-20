import { Ability, Retraining } from "./Player";
type HeroAbilities = {
    [key: string]: number;
};
export declare function inferHeroAbilityLevelsFromAbilityOrder(abilityOrder: (Ability | Retraining)[]): {
    finalHeroAbilities: HeroAbilities;
    retrainingHistory: {
        time: number;
        abilities: HeroAbilities;
    }[];
};
export {};
