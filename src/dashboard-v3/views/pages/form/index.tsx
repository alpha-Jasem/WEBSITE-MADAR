import StyleDivider from '@dv3/components/shared/StyleDivider';
import StyleAwareWrapper from '@dv3/components/shared/StyleAwareWrapper';
import BreadcrumbComp from '@dv3/layouts/full/shared/breadcrumb/BreadcrumbComp';
import FormCompo from '@dv3/components/form';
const BCrumb = [{ to: '/', title: 'Home' }, { title: 'Form' }];

function TablesPage() {
  return (
    <StyleAwareWrapper lyraClassName="flex flex-col p-px gap-px bg-border">
      <BreadcrumbComp title="Form Elements" items={BCrumb} />
      <StyleDivider />
      <FormCompo />
    </StyleAwareWrapper>
  );
}

export default TablesPage;
