import BlogPost from "@dv3/components/apps/blog/blog-post";
import BreadcrumbComp from "@dv3/layouts/full/shared/breadcrumb/BreadcrumbComp";
import StyleAwareWrapper from "@dv3/components/shared/StyleAwareWrapper";
import StyleDivider from "@dv3/components/shared/StyleDivider";

const BCrumb = [
  { to: "/", title: "Home" },
  { title: "Blog app" },
];

const Blog = () => {
  return (
    <StyleAwareWrapper
      lyraClassName="flex flex-col p-px gap-px bg-border"
      defaultClassName="flex flex-col gap-4"
    >
      <BreadcrumbComp title="Blog app" items={BCrumb} />
      <StyleDivider />
      <BlogPost />
    </StyleAwareWrapper>
  );
};
export default Blog;
