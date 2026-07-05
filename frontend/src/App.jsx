// src/App.jsx
import { useState } from "react";
import Cropper from "react-easy-crop";
import axios from "axios";
import { getCroppedImg } from "./cropImage";
import "./App.css";

const STAGES = {
  UPLOAD: "UPLOAD",
  VERIFY_AUTO: "VERIFY_AUTO",
  MANUAL_CROP: "MANUAL_CROP",
  RESULT: "RESULT",
};

// --- ABOUT PAGE COMPONENT ---
function AboutPage() {
  return (
    <div className="about-page">
      <h1>About OCCUNOVA</h1>
      <p>
        OCCUNOVA is a dual-stage convolutional neural network architecture
        designed for the automated pre-screening and anatomical verification of
        Glaucoma from raw retinal fundus imagery.
      </p>

      <h2>Model Architecture & Training</h2>
      <p>
        The pipeline relies on a cascading ensemble approach to minimize false
        negatives while maintaining high throughput.
      </p>
      <ul>
        <li>
          <strong>Localization (U-Net):</strong> The initial phase utilizes a
          U-Net architecture to isolate the optic disc. By extracting only the
          relevant 224x224 anatomical geometry, we eliminate peripheral noise
          and camera flash artifacts.
        </li>
        <li>
          <strong>The Triage:</strong> A heavily regularized ResNet50 model. It
          acts as a highly sensitive gatekeeper, designed to instantly clear
          healthy scans.
        </li>
        <li>
          <strong>The Specialist:</strong> Scans flagged by the Triage are
          escalated to a specialized ResNet50 model. This model was trained
          utilizing dynamic class weighting to heavily penalize minority-class
          (positive) misclassifications.
        </li>
      </ul>
      <p>
        The ensemble was trained on aggregated, professionally annotated
        clinical datasets, including <strong>ACRIMA</strong>,{" "}
        <strong>G1020</strong> and <strong>REFUGE2</strong>, ensuring exposure
        to a wide variance of lighting conditions and demographic anatomies.
      </p>

      <div className="limitations-box">
        <h3>System Limitations & Clinical Disclaimers</h3>
        <p>
          OCCUNOVA is an experimental research tool and is{" "}
          <strong>NOT FDA approved</strong> for standalone clinical diagnosis.
          Users must be aware of the following limitations:
        </p>
        <ul>
          <li>
            <strong>Auto-Crop Failure:</strong> The U-Net center-of-mass
            calculation may fail on images with severe lighting artifacts or
            macular degeneration, necessitating manual crop intervention.
          </li>
          <li>
            <strong>Triage Bias:</strong> Triage Model is intentionally biased
            toward false positives to ensure no potential Glaucoma case is
            accidentally discarded.
          </li>
          <li>
            <strong>Scope of Diagnosis:</strong> The model evaluates the optic
            cup-to-disc ratio and neuroretinal rim; it cannot measure
            intraocular pressure (IOP) or evaluate visual field loss.
          </li>
        </ul>
      </div>
    </div>
  );
}

// --- MAIN APP COMPONENT ---
function App() {
  const [currentPage, setCurrentPage] = useState("HOME"); // 'HOME' or 'ABOUT'

  const [stage, setStage] = useState(STAGES.UPLOAD);
  const [imageSrc, setImageSrc] = useState(null);
  const [autoCropB64, setAutoCropB64] = useState(null);
  const [analyzedImage, setAnalyzedImage] = useState(null); // NEW: Holds the final crop for the results page
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      let imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
      handleAutoCrop(file);
    }
  };

  const readFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result), false);
      reader.readAsDataURL(file);
    });
  };

  const handleAutoCrop = async (originalFile) => {
    try {
      setLoading(true);
      setLoadingText("U-Net Locating Optic Disc...");
      const formData = new FormData();
      formData.append("file", originalFile);
      const response = await axios.post(
        "https://pandadsgn-occunova-api.hf.space/autocrop",
        formData,
      );
      setAutoCropB64(response.data.auto_crop_b64);
      setStage(STAGES.VERIFY_AUTO);
    } catch (e) {
      console.error(e);
      alert("Auto-crop failed. Falling back to manual mode.");
      setStage(STAGES.MANUAL_CROP);
    } finally {
      setLoading(false);
    }
  };

  const runDiagnosis = async (blob) => {
    try {
      setLoading(true);
      setLoadingText("Running Cascade Diagnostics...");
      const formData = new FormData();
      formData.append("file", blob, "retina_crop.jpg");
      const response = await axios.post(
        "https://pandadsgn-occunova-api.hf.space/predict",
        formData,
      );
      setResult(response.data);
      setStage(STAGES.RESULT);
    } catch (e) {
      console.error(e);
      alert("System failure: Unable to connect to the inference engine.");
    } finally {
      setLoading(false);
    }
  };

  const acceptAutoCropAndDiagnose = async () => {
    setAnalyzedImage(autoCropB64); // Save the U-Net crop for the results screen
    const blob = await (await fetch(autoCropB64)).blob();
    runDiagnosis(blob);
  };

  const handleManualDiagnose = async () => {
    const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
    setAnalyzedImage(URL.createObjectURL(croppedBlob)); // Save the manual crop for the results screen
    runDiagnosis(croppedBlob);
  };

  return (
    <div className="app-wrapper">
      {/* HEADER SECTION */}
      <header className="app-header">
        <div className="header-spacer"></div>
        <h1 className="header-logo" onClick={() => setCurrentPage("HOME")}>
          OCCUNOVA
        </h1>
        <nav className="header-nav">
          <button
            className={`nav-link ${currentPage === "ABOUT" ? "active" : ""}`}
            onClick={() =>
              setCurrentPage(currentPage === "ABOUT" ? "HOME" : "ABOUT")
            }
          >
            {currentPage === "ABOUT"
              ? "Diagnostic Dashboard"
              : "About the Model"}
          </button>
        </nav>
      </header>

      {/* CONDITIONAL PAGE RENDERING */}
      {currentPage === "ABOUT" ? (
        <AboutPage />
      ) : (
        <div className="container">
          <section className="manifesto-section">
            <span className="tag-line">AI-Assisted Diagnostics</span>
            <h1 style={{ fontSize: "4rem" }}>
              Get the Output -<br />
              You Need <br />
              <span>Faster.</span>
            </h1>
            <p
              style={{
                fontSize: "1.2rem",
                color: "var(--text-muted)",
                marginBottom: "40px",
                maxWidth: "500px",
                lineHeight: "1.6",
              }}
            >
              The dual-stage convolutional neural network ensemble delivers
              advanced anatomical verification tailored to ophthalmic imaging.
            </p>
          </section>

          <section className="terminal-section">
            {stage === STAGES.UPLOAD && !loading && (
              <div
                className="upload-box"
                style={{ marginTop: "auto", marginBottom: "auto" }}
              >
                <h3 style={{ color: "var(--text-dark)" }}>
                  Upload Fundus Scan
                </h3>
                <input type="file" accept="image/*" onChange={onFileChange} />
              </div>
            )}

            {loading && (
              <div
                style={{ textAlign: "center", margin: "auto", padding: "40px" }}
              >
                <h3 style={{ color: "var(--primary-teal)" }}>{loadingText}</h3>
              </div>
            )}

            {stage === STAGES.VERIFY_AUTO && !loading && (
              <div style={{ textAlign: "center" }}>
                <h3 style={{ marginBottom: "5px" }}>U-Net Auto-Crop Target</h3>
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.9rem",
                    marginBottom: "20px",
                  }}
                >
                  Verify the optic disc is perfectly centered.
                </p>
                <img
                  src={autoCropB64}
                  alt="Auto Cropped"
                  style={{
                    width: "224px",
                    height: "224px",
                    borderRadius: "12px",
                    border: "2px solid var(--primary-teal)",
                    marginBottom: "30px",
                  }}
                />
                <div style={{ display: "flex", gap: "15px" }}>
                  <button
                    className="action-btn"
                    onClick={acceptAutoCropAndDiagnose}
                  >
                    LOOKS GOOD, RUN AI
                  </button>
                  <button
                    className="action-btn"
                    style={{
                      background: "#fff",
                      color: "var(--primary-teal)",
                      border: "2px solid var(--primary-teal)",
                    }}
                    onClick={() => setStage(STAGES.MANUAL_CROP)}
                  >
                    ADJUST MANUALLY
                  </button>
                </div>
              </div>
            )}

            {stage === STAGES.MANUAL_CROP && !loading && (
              <>
                <div className="cropper-container">
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onCropComplete={(cArea, cAreaPixels) =>
                      setCroppedAreaPixels(cAreaPixels)
                    }
                    onZoomChange={setZoom}
                  />
                </div>
                <button className="action-btn" onClick={handleManualDiagnose}>
                  CONFIRM CROP & INITIATE
                </button>
              </>
            )}

            {/* --- UPDATED RESULT STAGE --- */}
            {stage === STAGES.RESULT && result && !loading && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  marginTop: "auto",
                  marginBottom: "auto",
                }}
              >
                <h3 style={{ marginBottom: "15px", color: "var(--text-dark)" }}>
                  Analyzed Region
                </h3>

                {/* Displays the exact crop that the AI model analyzed */}
                {analyzedImage && (
                  <img
                    src={analyzedImage}
                    alt="Analyzed Patch"
                    style={{
                      width: "180px",
                      height: "180px",
                      borderRadius: "12px",
                      border: "2px solid var(--primary-teal)",
                      boxShadow: "var(--shadow-soft)",
                      marginBottom: "20px",
                    }}
                  />
                )}

                <div
                  className="results-panel"
                  style={{ width: "100%", marginTop: "0" }}
                >
                  <h2>DIAGNOSIS: {result.diagnosis.toUpperCase()}</h2>
                  <div className="metric">
                    <span>Triage:</span>
                    <span>{(result.triage_score * 100).toFixed(1)}%</span>
                  </div>
                  {result.spec_score && (
                    <div className="metric">
                      <span>Specialist:</span>
                      <span>{(result.spec_score * 100).toFixed(1)}%</span>
                    </div>
                  )}
                  <button
                    className="action-btn"
                    style={{ marginTop: "30px" }}
                    onClick={() => {
                      // Reset everything for a fresh scan
                      setStage(STAGES.UPLOAD);
                      setImageSrc(null);
                      setResult(null);
                      setAnalyzedImage(null);
                    }}
                  >
                    PROCESS NEW SCAN
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* FOOTER DISCLAIMER */}
      <footer
        style={{
          marginTop: "auto",
          textAlign: "center",
          padding: "15px 20px",
          fontSize: "0.85rem",
          color: "var(--text-muted)",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        OCCUNOVA is an experimental AI and can make mistakes. Always verify
        results with a qualified ophthalmologist.
      </footer>
    </div>
  );
}

export default App;
