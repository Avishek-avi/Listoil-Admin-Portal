import { z } from "zod";

export const slabSchema = z.object({
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
    rewardPoints: z.number().nonnegative(),
}).refine((s) => s.max > s.min, {
    message: "Slab max must be greater than min",
    path: ["max"],
});

export const schemeSchema = z.object({
    name: z.string().min(1).max(120),
    type: z.enum(["booster", "slab", "cross_sell", "promo"]),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    skuCodes: z.array(z.string().min(1)).min(1, "Select at least one SKU"),
    slabs: z.array(slabSchema).optional(),
    contiguousSlabs: z.boolean().optional(),
    rewardPoints: z.number().nonnegative().optional(),
}).superRefine((data, ctx) => {
    if (data.endDate <= data.startDate) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["endDate"],
            message: "End date must be after start date",
        });
    }

    if (data.type === "slab") {
        if (!data.slabs || data.slabs.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["slabs"],
                message: "Slab-based schemes require at least one slab",
            });
            return;
        }
        // Sort and validate non-overlap (and contiguity if requested)
        const sorted = [...data.slabs].sort((a, b) => a.min - b.min);
        for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const curr = sorted[i];
            if (curr.min < prev.max) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["slabs", i, "min"],
                    message: `Slab ${i + 1} overlaps slab ${i}`,
                });
            }
            if (data.contiguousSlabs && curr.min !== prev.max) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["slabs", i, "min"],
                    message: `Slab ${i + 1} must start where slab ${i} ends`,
                });
            }
        }
    }
});

export type SchemeInput = z.infer<typeof schemeSchema>;

export function validateSchemeInput(input: unknown) {
    return schemeSchema.safeParse(input);
}
