"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRetrainingIndex = void 0;
const RETRAINING_DETECTION_TIME_RANGE = 60 * 1000;
const getRetrainingIndex = (abilityOrder, timeOfTomeOfRetrainingPurchase) => {
    if (abilityOrder.length < 3) {
        return -1;
    }
    let candidateForFirstAbilityRelearnedAfterTomeUse = abilityOrder[0];
    let candidateForFirstAbilityRelearnedAfterTomeUseIndex = 0;
    let abilitiesLearnedInDetectionTimeRange = 0;
    for (let i = 1; i < abilityOrder.length; i++) {
        if (abilityOrder[i].time -
            candidateForFirstAbilityRelearnedAfterTomeUse.time <
            RETRAINING_DETECTION_TIME_RANGE) {
            abilitiesLearnedInDetectionTimeRange++;
        }
        else {
            abilitiesLearnedInDetectionTimeRange = 0;
            candidateForFirstAbilityRelearnedAfterTomeUse = abilityOrder[i];
            candidateForFirstAbilityRelearnedAfterTomeUseIndex = i;
        }
        if (abilitiesLearnedInDetectionTimeRange === 2 &&
            candidateForFirstAbilityRelearnedAfterTomeUse.time -
                timeOfTomeOfRetrainingPurchase <=
                RETRAINING_DETECTION_TIME_RANGE) {
            return candidateForFirstAbilityRelearnedAfterTomeUseIndex;
        }
    }
    return -1;
};
exports.getRetrainingIndex = getRetrainingIndex;
//# sourceMappingURL=detectRetraining.js.map