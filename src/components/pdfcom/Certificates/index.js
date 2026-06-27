import { PDFViewer } from "@react-pdf/renderer";
import Certificate from "./CertificateCom";
import { useSelector } from "react-redux";
import CertificateServerSide from "./CertificateComServerSide";


const CertificateViewer = ({memberData,selectedProgram}) => {

  return (
    <PDFViewer style={{ width: '100%', height: '100vh', border: 'none' }}>
      <CertificateServerSide data={memberData} selectedProgram={selectedProgram}  />
      {/* <Certificate data={memberData} selectedProgram={selectedProgram}  /> */}
    </PDFViewer>
  );
};

export default CertificateViewer;