
export const BASE_COMMISSION = 75; 
export const LEVEL_STEP = 30;     
export const LEVEL_BONUS = 5;      
export const ACTIVATION_FEE = 200;
export const SALARY_TARGET = 2000;
export const SALARY_AMOUNT = 5000;

export const REFERRAL_STRUCTURE = [
  { level: 1, amount: 75, description: "Direct Referral" }, 
  { level: 2, amount: 80, description: "Direct Referral (Level 2)" }, // Example logic place holder
  { level: 2, amount: 35, description: "Generation 2" },
  { level: 3, amount: 25, description: "Generation 3" },
  { level: 4, amount: 15, description: "Generation 4" },
  { level: 5, amount: 10, description: "Generation 5" },
];

// Generate levels 6-15 (3 Taka)
for (let i = 6; i <= 15; i++) {
  REFERRAL_STRUCTURE.push({ level: i, amount: 3, description: `Gen ${i}` });
}
// Generate levels 16-35 (2 Taka)
for (let i = 16; i <= 35; i++) {
  REFERRAL_STRUCTURE.push({ level: i, amount: 2, description: `Gen ${i}` });
}