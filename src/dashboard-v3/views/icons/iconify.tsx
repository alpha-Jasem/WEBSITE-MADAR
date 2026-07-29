import IconifyIcon from "@dv3/components/icons/iconify-icons";
import BreadcrumbComp from "@dv3/layouts/full/shared/breadcrumb/BreadcrumbComp";
import StyleAwareWrapper from "@dv3/components/shared/StyleAwareWrapper";
import StyleDivider from "@dv3/components/shared/StyleDivider";

const BCrumb = [
  { to: "/", title: "Home" },
  { title: "Iconify Icons" },
];

const page = () => {
  return (
    <StyleAwareWrapper
      lyraClassName="flex flex-col p-px gap-px bg-border"
      defaultClassName="flex flex-col gap-4"
    >
      <BreadcrumbComp title="Iconify Icons" items={BCrumb} />
      <StyleDivider />
      <IconifyIcon />
    </StyleAwareWrapper>
  );
};

export default page;
