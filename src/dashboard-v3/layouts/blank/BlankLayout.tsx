import { Outlet } from "react-router";
import ScrollToTop from "@dv3/components/shared/ScrollToTop";

const BlankLayout = () => (
  <>
    <ScrollToTop>
      <Outlet />
    </ScrollToTop>
  </>
);

export default BlankLayout;
