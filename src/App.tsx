/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Viz from "./pages/Viz";
import ControlPanel from "./pages/ControlPanel";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Viz />} />
        <Route path="/ipad" element={<ControlPanel />} />
      </Routes>
    </BrowserRouter>
  );
}
