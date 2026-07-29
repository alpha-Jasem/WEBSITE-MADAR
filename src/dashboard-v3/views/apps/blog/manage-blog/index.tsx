import BreadcrumbComp from "@dv3/layouts/full/shared/breadcrumb/BreadcrumbComp";
import { BlogProvider } from "@dv3/context/blog-context";
import ManageBlogTable from "@dv3/components/apps/blog/blogtable/manage-blogtable";
import StyleAwareWrapper from "@dv3/components/shared/StyleAwareWrapper";
import StyleDivider from "@dv3/components/shared/StyleDivider";

const BCrumb = [
  { to: "/", title: "Home" },
  { title: "Manage Blog" },
];

const MangeBlog = () => {
  return (
    <BlogProvider>
      <StyleAwareWrapper
        lyraClassName="flex flex-col p-px gap-px bg-border"
        defaultClassName="flex flex-col gap-4"
      >
        <BreadcrumbComp title=" Manage Blog" items={BCrumb} />
        <StyleDivider />
        <ManageBlogTable />
      </StyleAwareWrapper>
    </BlogProvider>
  );
};

export default MangeBlog;
