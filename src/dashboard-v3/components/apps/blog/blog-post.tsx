


import { BlogProvider } from "@dv3/context/blog-context";
import BlogListing from "./blog-listing";

const BlogPost = () => {
  return (
    <>
      <BlogProvider>
        <BlogListing />
      </BlogProvider>
    </>
  );
};

export default BlogPost;
