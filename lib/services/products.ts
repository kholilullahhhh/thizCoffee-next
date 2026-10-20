import { ApiError } from '@/lib/api';
import type { DbExecutor } from '@/lib/db';

export interface RecipeInput {
  ingredientId: string;
  quantity: number;
}

/**
 * Recipe rows are replaced as a set. Reject duplicates and missing/inactive
 * ingredients before deleting the current BOM, so a failed edit cannot leave a
 * product without a recipe.
 */
export async function validateRecipe(db: DbExecutor, recipe: RecipeInput[]) {
  const seen = new Set<string>();
  for (const item of recipe) {
    if (seen.has(item.ingredientId)) {
      throw new ApiError(422, 'Satu bahan tidak boleh muncul lebih dari sekali dalam resep.');
    }
    seen.add(item.ingredientId);
    const rows = await db.query<{ name: string; active: boolean }>(
      'SELECT name, active FROM ingredients WHERE id = $1',
      [item.ingredientId]
    );
    if (!rows.length || !rows[0].active) {
      throw new ApiError(422, 'Bahan dalam resep tidak ditemukan atau sudah nonaktif.');
    }
  }
}
