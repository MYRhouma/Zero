import { compose, generateEmailSubject } from './compose';
import { editDesign } from './edit-design';
import { generateSearchQuery } from './search';
import { webSearch } from './webSearch';
import { router } from '../../trpc';

export const aiRouter = router({
  generateSearchQuery,
  compose,
  generateEmailSubject,
  editDesign,
  webSearch,
});
