export interface ChildItem {
  id?: number | string;
  name: string;
  icon?: LucideIcon;
  items?: ChildItem[];
  item?: unknown;
  url?: string;
  color?: string;
  disabled?: boolean;
  subtitle?: string;
  badge?: boolean;
  badgeType?: string;
  badgeContent?: string;
  isActive?: boolean;
  external?: boolean;
  isPro?: boolean
}

export interface MenuItem {
  heading?: string;
  name?: string;
  icon?: LucideIcon;
  id?: number;
  to?: string;
  item?: MenuItem[];
  items?: ChildItem[];
  url?: string;
  disabled?: boolean;
  subtitle?: string;
  badgeType?: string;
  badge?: boolean;
  badgeContent?: string;
  isActive?: boolean;
  isPro?: boolean
}

import { uniqueId } from "lodash";

import {
  BookOpen,
  Lock,
  LogIn,
  LucideIcon,
  Ticket,
  Unlink,
  UserPlus, Smile, House, NotebookText,
  Table2,
  Form,
  CircleUserRound,
  ShieldCheck,
} from "lucide-react"

const SidebarContent: MenuItem[] = [
  {
    heading: "Dashboard",
    items: [
      {
        id: uniqueId(),
        name: "Modern",
        icon: House,
        url: "/clinic-os/dashboard",
      }
    ],
  },
  {
    heading: "Pages",
    items: [
      {
        id: uniqueId(),
        name: "Table",
        icon: Table2,
        url: "/clinic-os/dashboard/tables",
      },
      {
        id: uniqueId(),
        name: "Form",
        icon: Form,
        url: "/clinic-os/dashboard/form",
      },
      {
        id: uniqueId(),
        name: "User Profile",
        icon: CircleUserRound,
        url: "/clinic-os/dashboard/profile",
      },
    ],
  },
  {
    heading: "Apps",
    items: [
      {
        id: uniqueId(),
        name: "Notes",
        icon: NotebookText,
        url: "/clinic-os/dashboard/notes",
      },
      {
        name: "Blogs",
        id: uniqueId(),
        icon: BookOpen,
        items: [
          {
            id: uniqueId(),
            name: "Blog Listing",
            url: "/clinic-os/dashboard/blog/post",
          },
          {
            id: uniqueId(),
            name: "Blog Detail",
            url: "/clinic-os/dashboard/blog/detail/streaming-video-way-before-it-was-cool-go-dark-tomorrow",
          },
          {
            id: uniqueId(),
            name: "Blog Edit",
            url: "/clinic-os/dashboard/blog/edit",
          },
          {
            id: uniqueId(),
            name: "Blog Create",
            url: "/clinic-os/dashboard/blog/create",
          },
          {
            id: uniqueId(),
            name: "Manage Blog",
            url: "/clinic-os/dashboard/blog/manage-blog",
          },
        ],
      },
      {
        id: uniqueId(),
        name: "Tickets",
        icon: Ticket,
        url: "/clinic-os/dashboard/tickets",
      },
    ],
  },
  {
    heading: "Icons",
    items: [
      {
        id: uniqueId(),
        name: "Iconify Icons",
        icon: Smile,
        url: "/clinic-os/dashboard/icons",
      },
    ],
  },
  {
    heading: "Auth",
    items: [
      {
        id: uniqueId(),
        name: "Error",
        icon: Unlink,
        url: "/clinic-os/error",
      },
      {
        name: "Login",
        id: uniqueId(),
        icon: LogIn,
        items: [
          {
            id: uniqueId(),
            name: "Boxed Login",
            url: "/clinic-os/login",
          },
        ],
      },
      {
        name: "Register",
        id: uniqueId(),
        icon: UserPlus,
        items: [
          {
            id: uniqueId(),
            name: "Boxed Register",
            url: "/clinic-os/register",
          },
        ],
      },
      {
        name: "Forgot Password",
        id: uniqueId(),
        icon: Lock,
        items: [
          {
            id: uniqueId(),
            name: "Boxed Forgot Pwd",
            url: "/clinic-os/forgot-password",
          },
        ],
      },
      {
        name: "Two Steps",
        id: uniqueId(),
        icon: ShieldCheck,
        items: [
          {
            id: uniqueId(),
            name: "Boxed Two Steps",
            url: "/clinic-os/two-steps",
          },
        ],
      }
    ],
  },
];

export default SidebarContent;
