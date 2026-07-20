import { z } from "zod";

export const GenerateSalaryEstimateInputSchema = z.object({
  role: z.string().trim().min(1, "Role is required"),
  location: z.string().trim().min(1, "Location is required"),
  yearsOfExperience: z.number().min(0).max(60),
  skills: z.array(z.string()).optional(),
  currentSalary: z.number().min(0).optional(),
});
