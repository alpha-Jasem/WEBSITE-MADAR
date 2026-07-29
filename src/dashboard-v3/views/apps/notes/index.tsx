import NotesApp from "@dv3/components/apps/notes";
import BreadcrumbComp from "@dv3/layouts/full/shared/breadcrumb/BreadcrumbComp";
import StyleAwareWrapper from "@dv3/components/shared/StyleAwareWrapper";
import StyleDivider from "@dv3/components/shared/StyleDivider";

const BCrumb = [
  { to: "/", title: "Home" },
  { title: "Notes" },
];

const Notes = () => {
  return (
    <StyleAwareWrapper
      lyraClassName="flex flex-col p-px gap-px bg-border"
      defaultClassName="flex flex-col gap-4"
    >
      <BreadcrumbComp title="Notes app" items={BCrumb} />
      <StyleDivider />
      <NotesApp />
    </StyleAwareWrapper>
  );
};

export default Notes;
