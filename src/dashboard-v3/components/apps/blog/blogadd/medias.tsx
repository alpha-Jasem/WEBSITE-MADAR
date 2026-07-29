
import { Card, CardContent, CardHeader, CardTitle } from "@dv3/components/ui/card";
import FileUploadMotion from "@dv3/components/animated-components/file-uploadmotion";

const Media = () => {
  return (
    <>
       <Card>
        <CardHeader>
          <CardTitle>
            <h5>Cover Image</h5>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileUploadMotion />
        </CardContent>
      </Card>
    </>
  );
};

export default Media;
