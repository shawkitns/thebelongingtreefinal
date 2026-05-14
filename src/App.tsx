/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import Viz from "./pages/Viz";
// import ControlPanel from "./pages/ControlPanel";

// export default function App() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<Viz />} />
//         <Route path="/ipad" element={<ControlPanel />} />
//       </Routes>
//     </BrowserRouter>
//   );
// }

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Viz from './pages/Viz'; // Your Map
import ControlPanel from './pages/ControlPanel'; // Keep your original name

function App() {
  return (
    <Router>
      <Routes>
        {/* The Projection: https://thebelongingtree.vercel.app/ */}
        <Route path="/" element={<Viz />} />
        
        {/* The iPad: https://thebelongingtree.vercel.app/ipad */}
        <Route path="/ipad" element={<ControlPanel />} />
      </Routes>
    </Router>
  );
}

export default App;
