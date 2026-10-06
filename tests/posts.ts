import { type MediaCollection, sort } from '$lib/reddit/Media';

/** The posts from TEST-POSTS.md. */
export const POSTS = [
  'https://www.reddit.com/r/nba/comments/1ty68vr/karlanthony_towns_if_you_lose_a_parentyou_just/',
  'https://www.reddit.com/r/gameofthrones/comments/1ty4uj0/the_cast_then_and_now/',
  'https://www.reddit.com/r/doohickeycorporation/comments/1tyia4w/the_sound_department_collaborated_with_the_sweets/',
  'https://www.reddit.com/r/hobart/comments/qxs8w2/hobart_town_hall/',
  'https://www.reddit.com/r/ffxiv/comments/124meh9/microwaved_lalashark/',
  'https://www.reddit.com/r/formula1/comments/1txxsby/charles_driving_to_perfection_in_fp1/',
  'https://www.reddit.com/r/spaceporn/comments/1tywwwh/oc_just_updated_my_giantimpact_hypothesis_sim/',
  'https://www.reddit.com/r/TopCharacterTropes/comments/1tx5ku4/using_powers_for_mundane_tasks',
  'https://www.reddit.com/r/rupaulsdragrace/comments/1ty81bn/i_need_old_untucked_back',
  'http://localhost:5173/r/IDONTGIVEASWAG/comments/1fln5rl/19_meme_dump_with_surprise_at_the_end/',
  'https://www.reddit.com/user/Lachee/comments/1wjkzx1/this_is_a_test_profile_post/',
  'https://www.reddit.com/r/ClaudeAI/comments/1wol22c/comment/pbo3njw/',
];

/** Summarises the media into what the page shows, for the snapshots. */
export function summarize(collection: MediaCollection) {
  return collection.map(media => {
    const counts: Record<string, number> = {};
    for (const variant of media.variants)
      counts[variant.type] = (counts[variant.type] ?? 0) + 1;

    const best = sort(media.variants)[0];
    return {
      id:       media.id,
      type:     media.type,
      variants: counts,
      best:     best && {
        type:      best.type,
        href:      best.href.replace(/\?.*$/, ''),
        dimension: best.dimension && `${best.dimension.width}x${best.dimension.height}`,
      },
    };
  });
}
