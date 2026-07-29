import BlogDetailData from "@dv3/components/apps/blog/detail";
import { BlogProvider } from "@dv3/context/blog-context";
import BreadcrumbComp from "@dv3/layouts/full/shared/breadcrumb/BreadcrumbComp";
import StyleAwareWrapper from "@dv3/components/shared/StyleAwareWrapper";
import StyleDivider from "@dv3/components/shared/StyleDivider";

const BCrumb = [
  { to: "/", title: "Home" },
  { title: "Blog Detail" },
];

const BlogDetail = () => {
  return (
    <BlogProvider>
      <StyleAwareWrapper
        lyraClassName="flex flex-col p-px gap-px bg-border"
        defaultClassName="flex flex-col gap-4"
      >
        <BreadcrumbComp title="Blog Detail" items={BCrumb} />
        <StyleDivider />
        <BlogDetailData />
      </StyleAwareWrapper>
    </BlogProvider>
  );
};

export default BlogDetail;
