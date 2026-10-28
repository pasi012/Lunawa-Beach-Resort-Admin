import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import ManageGallery from "./pages/ManageGallery";
import ManageBooking from "./pages/ManageBooking";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>

        <Route path="/" element={<Home />} />
        <Route path="/manage-gallery" element={<ManageGallery />} />
        <Route path="/manage-booking" element={<ManageBooking />} />

      </Routes>
    </Router>
  );
}

export default App;
