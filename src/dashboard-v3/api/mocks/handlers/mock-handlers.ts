

import { Bloghandlers } from '@dv3/api/blog/blogdata';
import { NotesHandlers } from '@dv3/api/notes/notedata';
import { TicketHandlers } from '@dv3/api/ticket/ticket-data';


export const mockHandlers = [
  ...Bloghandlers,
  ...NotesHandlers,
  ...TicketHandlers,
];
