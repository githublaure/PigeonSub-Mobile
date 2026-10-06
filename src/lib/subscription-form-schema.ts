import { z } from 'zod';
import { parseDay } from './subscription-math';

export const subscriptionFormSchema = z
  .object({
    name: z
      .string({ required_error: 'Le nom est obligatoire' })
      .min(1, 'Le nom est obligatoire'),
    price: z
      .string({ required_error: 'Le prix est obligatoire' })
      .regex(
        /^\d+([.,]\d{1,2})?$/,
        'Saisissez un prix valide, par exemple 9,99',
      ),
    frequency: z.enum(['monthly', 'yearly', 'weekly', 'lifetime'], {
      errorMap: () => ({ message: 'Choisissez une fréquence' }),
    }),
    category: z.string().min(1, 'Choisissez une catégorie'),
    usageFrequency: z
      .enum(['very_used', 'used', 'rarely_used'])
      .default('used'),
    categoryColor: z.string().optional(),
    nextRenewal: z
      .string()
      .refine(
        (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !!parseDay(value),
        'Choisissez une date valide.',
      )
      .optional()
      .or(z.literal('')),
    isTrial: z.boolean().default(false),
    trialEndsAt: z
      .string()
      .refine(
        (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !!parseDay(value),
        'Choisissez une date valide.',
      )
      .optional()
      .or(z.literal('')),
    useSafetyDate: z.boolean().default(false),
    safetyDate: z
      .string()
      .refine(
        (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !!parseDay(value),
        'Choisissez une date valide.',
      )
      .optional()
      .or(z.literal('')),
    purchaseDate: z
      .string()
      .refine(
        (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !!parseDay(value),
        'Choisissez une date valide.',
      )
      .optional()
      .or(z.literal('')),
    rating: z.number().min(1).max(5).nullable().optional(),
    note: z.string().optional(),
    isActive: z.boolean().default(true),
    isFlagged: z.boolean().default(false),
  })
  .superRefine((values, ctx) => {
    if (values.isTrial) {
      if (!parseDay(values.trialEndsAt))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['trialEndsAt'],
          message: 'Renseignez la date de fin de l’essai gratuit.',
        });
      if (values.frequency === 'lifetime')
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['frequency'],
          message:
            'Un essai gratuit doit être suivi d’un abonnement récurrent.',
        });
      const end = parseDay(values.trialEndsAt);
      const payment = parseDay(values.nextRenewal);
      if (end && payment && payment < end)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['nextRenewal'],
          message:
            'Le premier prélèvement doit être à la fin de l’essai ou après.',
        });
    }
    if (!values.useSafetyDate || values.frequency === 'lifetime') return;
    const safety = parseDay(values.safetyDate);
    const renewal = parseDay(
      values.isTrial ? values.trialEndsAt : values.nextRenewal,
    );
    if (!renewal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [values.isTrial ? 'trialEndsAt' : 'nextRenewal'],
        message: values.isTrial
          ? 'Choisissez la fin de l’essai.'
          : 'Choisissez le prochain prélèvement pour définir la sûreté.',
      });
    }
    if (!safety || (renewal && safety >= renewal)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['safetyDate'],
        message: !safety
          ? 'Choisissez votre date de sûreté.'
          : values.isTrial
            ? 'La sûreté doit précéder la fin de l’essai.'
            : 'La sûreté doit précéder le prélèvement.',
      });
    }
  });

export type SubscriptionFormValues = z.infer<typeof subscriptionFormSchema>;
