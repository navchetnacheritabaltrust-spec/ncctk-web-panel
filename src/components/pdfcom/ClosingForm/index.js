import { PDFViewer } from "@react-pdf/renderer";
import { useSelector } from "react-redux";
import ClosingFormPdf from "./ClosingFormPdf";


const ClosingFormViewer = ({data,selectedProgram,payStatus,paymentData}) => {

  return (
    <PDFViewer style={{ width: '100%', height: '100vh', border: 'none' }}>
      <ClosingFormPdf paymentData={paymentData} payStatus={payStatus} data={data} selectedProgram={selectedProgram}/>
    </PDFViewer>
  );
};

export default ClosingFormViewer;