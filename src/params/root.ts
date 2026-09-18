import type { ParamMatcher } from '@sveltejs/kit';
import { PERMALINK_ROOTS } from '$lib/reddit/Utilities';

// Ensures that the root is a valid reddit permalink root.
export const match = ((param) => PERMALINK_ROOTS.includes(param as any)) satisfies ParamMatcher;
