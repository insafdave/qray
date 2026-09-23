import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import QRCode from "qrcode";
import jsQR from "jsqr";
import "./App.css";

function App() {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [qrMatrix, setQrMatrix] = useState(null);
  const [beautyLevel, setBeautyLevel] = useState(35);
  const [qrMode, setQrMode] = useState("classic");
  const [safeBeautyLevel, setSafeBeautyLevel] = useState(null);

  const artisticQrRef = useRef(null);
  const safeTestRunRef = useRef(0);

  const scanSvgElement = async (svg) => {
    if (!svg) return null;

    return new Promise((resolve) => {
      try {
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);

        const svgBlob = new Blob([svgString], {
          type: "image/svg+xml;charset=utf-8",
        });

        const svgUrl = URL.createObjectURL(svgBlob);
        const image = new Image();

        const cleanup = () => {
          URL.revokeObjectURL(svgUrl);
        };

        image.onload = () => {
          try {
            const viewBox = svg.viewBox.baseVal;
            const scale = 4;

            const canvas = document.createElement("canvas");

            canvas.width = viewBox.width * scale;
            canvas.height = viewBox.height * scale;

            const context = canvas.getContext("2d", {
              willReadFrequently: true,
            });

            if (!context) {
              cleanup();
              resolve(null);
              return;
            }

            context.imageSmoothingEnabled = false;

            context.drawImage(image, 0, 0, canvas.width, canvas.height);

            const imageData = context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height,
            );

            const result = jsQR(
              imageData.data,
              imageData.width,
              imageData.height,
            );

            cleanup();
            resolve(result && result.data ? result.data : null);
          } catch (error) {
            console.error("QR image scan failed:", error);
            cleanup();
            resolve(null);
          }
        };

        image.onerror = () => {
          cleanup();
          resolve(null);
        };

        image.src = svgUrl;
      } catch (error) {
        console.error("SVG scan preparation failed:", error);
        resolve(null);
      }
    });
  };
  const testArtisticLevel = async (level) => {
    if (!qrMatrix) return false;

    const testContainer = document.createElement("div");

    testContainer.setAttribute("aria-hidden", "true");
    testContainer.style.position = "fixed";
    testContainer.style.left = "-10000px";
    testContainer.style.top = "0";
    testContainer.style.width = "1px";
    testContainer.style.height = "1px";
    testContainer.style.overflow = "hidden";
    testContainer.style.pointerEvents = "none";

    document.body.appendChild(testContainer);

    const testRoot = createRoot(testContainer);
    const testQrRef = { current: null };

    try {
      testRoot.render(renderArtisticQR(level, testQrRef));

      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      });

      const svg = testQrRef.current;

      if (!svg) {
        return false;
      }

      const decodedData = await scanSvgElement(svg);

      return Boolean(decodedData);
    } catch (error) {
      console.error(`Beauty level ${level}% test failed:`, error);
      return false;
    } finally {
      testRoot.unmount();
      testContainer.remove();
    }
  };

  const findSafeBeautyLevel = async () => {
    if (!qrMatrix) return;

    const runId = safeTestRunRef.current;
    const levels = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    let safestLevel = 0;

    setSafeBeautyLevel(null);

    for (const level of levels) {
      if (runId !== safeTestRunRef.current) {
        return;
      }

      const isReadable = await testArtisticLevel(level);

      if (isReadable) {
        safestLevel = level;
      }
    }

    if (runId === safeTestRunRef.current) {
      setSafeBeautyLevel(safestLevel);

      setBeautyLevel((currentLevel) =>
        currentLevel > safestLevel ? safestLevel : currentLevel,
      );
    }
  };

  const generateQRCode = async () => {
    const value = url.trim();

    if (!value) {
      setUrlError("Please enter a URL.");
      return;
    }

    try {
      const parsedUrl = new URL(value);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        setUrlError("Please enter a valid URL.");
        return;
      }

      setUrlError("");

      const qr = await QRCode.toDataURL(value, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: "H",
      });

      const qrModel = QRCode.create(value, {
        errorCorrectionLevel: "H",
      });

      setQrCode(qr);
      setQrMatrix(qrModel);
    } catch (error) {
      setUrlError("Please enter a valid URL.");
    }
  };

  const downloadClassicQR = () => {
    if (!qrCode) return;

    const link = document.createElement("a");

    link.href = qrCode;
    link.download = "qray.png";

    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadArtisticQR = async () => {
    const svg = artisticQrRef.current;

    if (!svg) return;

    try {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);

      const svgBlob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });

      const svgUrl = URL.createObjectURL(svgBlob);
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = 3;

        canvas.width = svg.viewBox.baseVal.width * scale;
        canvas.height = svg.viewBox.baseVal.height * scale;

        const context = canvas.getContext("2d");

        if (!context) {
          URL.revokeObjectURL(svgUrl);
          return;
        }

        context.imageSmoothingEnabled = false;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const link = document.createElement("a");
        link.download = "qray-artistic.png";
        link.href = canvas.toDataURL("image/png");

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(svgUrl);
      };

      image.onerror = () => {
        URL.revokeObjectURL(svgUrl);
      };

      image.src = svgUrl;
    } catch (error) {
      console.error("Artistic QR download failed:", error);
    }
  };
  const renderArtisticQR = (level = beautyLevel, qrRef = artisticQrRef) => {
    if (!qrMatrix) return null;

    const { size, data, reservedBit } = qrMatrix.modules;

    const artisticStrength = level / 100;

    const moduleSize = 10;
    const padding = 40;
    const totalSize = size * moduleSize + padding * 2;

    if (level === 0) {
      return (
        <svg
          ref={qrRef}
          className="artistic-qr"
          viewBox={`0 0 ${totalSize} ${totalSize}`}
          role="img"
          aria-label="Reliable QR code"
        >
          <rect
            x="0"
            y="0"
            width={totalSize}
            height={totalSize}
            fill="#ffffff"
          />

          {Array.from(data).map((cell, index) => {
            if (!cell) return null;

            const row = Math.floor(index / size);
            const col = index % size;

            return (
              <rect
                key={index}
                x={padding + col * moduleSize}
                y={padding + row * moduleSize}
                width={moduleSize}
                height={moduleSize}
                fill="#16372d"
              />
            );
          })}
        </svg>
      );
    }

    const isArtisticDark = (row, col) => {
      if (row < 0 || row >= size || col < 0 || col >= size) {
        return false;
      }

      const index = row * size + col;

      return data[index] === 1 && !reservedBit[index];
    };

    const getPoint = (row, col) => ({
      x: padding + col * moduleSize + moduleSize / 2,
      y: padding + row * moduleSize + moduleSize / 2,
    });

    const getNeighbors = (row, col) => {
      return [
        isArtisticDark(row - 1, col),
        isArtisticDark(row + 1, col),
        isArtisticDark(row, col - 1),
        isArtisticDark(row, col + 1),
      ].filter(Boolean).length;
    };

    return (
      <svg
        ref={qrRef}
        className="artistic-qr"
        viewBox={`0 0 ${totalSize} ${totalSize}`}
        role="img"
        aria-label="Artistic QR code"
      >
        <rect
          x="0"
          y="0"
          width={totalSize}
          height={totalSize}
          rx="18"
          fill="#ffffff"
        />

        {/* Organic branches */}
        {Array.from(data).map((cell, index) => {
          if (!cell || reservedBit[index]) return null;

          const row = Math.floor(index / size);
          const col = index % size;

          const current = getPoint(row, col);

          const neighbors = getNeighbors(row, col);

          const branchWidth = Math.max(
            2.4,
            (neighbors >= 3 ? 6.5 : neighbors === 2 ? 5.2 : 4.2) *
              (0.65 + artisticStrength * 0.35),
          );

          const paths = [];

          // Right branch
          if (isArtisticDark(row, col + 1)) {
            const next = getPoint(row, col + 1);
            const midX = (current.x + next.x) / 2;

            paths.push(
              <path
                key={`${index}-right`}
                d={`
                M ${current.x} ${current.y}
                Q ${midX} ${current.y - 1}
                  ${next.x} ${next.y}
              `}
                fill="none"
                stroke="#3f7652"
                strokeWidth={branchWidth}
                strokeLinecap="round"
                opacity={artisticStrength}
              />,
            );
          }

          // Down branch
          if (isArtisticDark(row + 1, col)) {
            const next = getPoint(row + 1, col);
            const midY = (current.y + next.y) / 2;

            paths.push(
              <path
                key={`${index}-down`}
                d={`
                M ${current.x} ${current.y}
                Q ${current.x - 1} ${midY}
                  ${next.x} ${next.y}
              `}
                fill="none"
                stroke="#3f7652"
                strokeWidth={branchWidth}
                strokeLinecap="round"
                opacity={artisticStrength}
              />,
            );
          }

          return paths;
        })}

        {/* Organic leaf nodes */}
        {Array.from(data).map((cell, index) => {
          if (!cell || reservedBit[index]) return null;

          const row = Math.floor(index / size);
          const col = index % size;

          const point = getPoint(row, col);
          const neighbors = getNeighbors(row, col);

          // Dense junctions stay as branch nodes
          if (neighbors >= 3) {
            const radius = 3 + artisticStrength * 0.8;

            return (
              <circle
                key={`node-${index}`}
                cx={point.x}
                cy={point.y}
                r={radius}
                fill="#3f7652"
              />
            );
          }

          // End points become small leaf-like shapes
          if (neighbors === 1) {
            return (
              <ellipse
                key={`leaf-${index}`}
                cx={point.x}
                cy={point.y}
                rx={3 + artisticStrength * 1.5}
                ry={2 + artisticStrength * 0.8}
                fill="#4f8a5f"
                transform={`rotate(${(row + col) % 2 === 0 ? -35 : 35} ${point.x} ${point.y})`}
                opacity={0.35 + artisticStrength * 0.65}
              />
            );
          }

          // Normal branch module
          return (
            <circle
              key={`node-${index}`}
              cx={point.x}
              cy={point.y}
              r={2.2 + artisticStrength * 0.8}
              fill="#3f7652"
            />
          );
        })}

        {/* Protected QR structure */}
        {Array.from(data).map((cell, index) => {
          if (!cell || !reservedBit[index]) return null;

          const row = Math.floor(index / size);
          const col = index % size;

          const x = padding + col * moduleSize;
          const y = padding + row * moduleSize;

          return (
            <rect
              key={`reserved-${index}`}
              x={x}
              y={y}
              width={moduleSize}
              height={moduleSize}
              fill="#16372d"
            />
          );
        })}
      </svg>
    );
  };

  useEffect(() => {
    safeTestRunRef.current += 1;

    if (!qrMatrix || qrMode !== "artistic") {
      setSafeBeautyLevel(null);
      return;
    }

    findSafeBeautyLevel();
  }, [qrMatrix, qrMode]);

  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo">
          QR<span>ay</span>
        </div>

        <a className="nav-link" href="#about">
          How it works
        </a>
      </nav>

      <main className="hero">
        <section className="hero-content">
          <span className="eyebrow">Beautiful QR generation</span>

          <h1>
            Make your link
            <br />
            <span>worth scanning.</span>
          </h1>

          <p>
            Turn any URL into a beautiful, customizable QR code — while keeping
            it reliable and easy to scan.
          </p>

          <div className="url-box">
            <input
              type="url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setUrlError("");
              }}
              placeholder="Paste your URL..."
              aria-label="URL"
            />

            <button className="generate-btn" onClick={generateQRCode}>
              Generate
            </button>
          </div>

          {urlError && (
            <p className="url-error" role="alert">
              {urlError}
            </p>
          )}

          <div className="mode-switch">
            <button
              className={`mode-option ${qrMode === "classic" ? "active" : ""}`}
              onClick={() => setQrMode("classic")}
            >
              Classic
            </button>

            <button
              className={`mode-option ${qrMode === "artistic" ? "active" : ""}`}
              onClick={() => setQrMode("artistic")}
            >
              Artistic
            </button>
          </div>

          {qrMode === "artistic" && (
            <div className="beauty-control">
              <div className="beauty-control-header">
                <span>Reliability</span>
                <strong>{beautyLevel}%</strong>
                <span>Beauty</span>
              </div>

              <input
                type="range"
                min="0"
                max={safeBeautyLevel ?? 100}
                value={beautyLevel}
                onChange={(event) => setBeautyLevel(Number(event.target.value))}
                style={{
                  background: `linear-gradient(
                to right,
               #285c43 0%,
               #78a982 ${beautyLevel}%,
               #dce8dc ${beautyLevel}%,
               #dce8dc 100%
         )`,
                }}
                aria-label="Beauty and reliability"
              />
            </div>
          )}
        </section>

        <section className="preview-card">
          {qrCode ? (
            qrMode === "classic" ? (
              <div className="qr-download-section">
                <img
                  src={qrCode}
                  alt="Generated QR code"
                  className="qr-preview"
                />

                <button className="download-btn" onClick={downloadClassicQR}>
                  Download PNG
                </button>
              </div>
            ) : (
              qrMatrix && (
                <div className="artistic-preview">
                  <h3>QRay Artistic</h3>

                  {renderArtisticQR()}

                  <button className="download-btn" onClick={downloadArtisticQR}>
                    Download PNG
                  </button>
                </div>
              )
            )
          ) : (
            <div className="preview-placeholder">
              <div className="icon">✦</div>
              <h2>Your QR will appear here</h2>
              <p>Enter a URL to begin creating.</p>
            </div>
          )}
        </section>
      </main>

      <section className="real-world-section" id="real-world">
        <div className="real-world-header">
          <span className="eyebrow">Real-world preview</span>

          <h2>
            See your QR
            <br />
            <span>in the real world.</span>
          </h2>

          <p>
            Preview how your QR code could look in everyday situations before
            downloading it.
          </p>
        </div>

        <div className="real-world-grid">
          <div className="real-world-card phone-preview-card">
            <div className="phone-mockup">
              <div className="phone-screen">
                {qrCode &&
                  (qrMode === "artistic" ? (
                    renderArtisticQR(beautyLevel, null)
                  ) : (
                    <img
                      src={qrCode}
                      alt="QR phone preview"
                      className="real-world-qr"
                    />
                  ))}
              </div>
            </div>

            <h3>Phone</h3>
            <p>See your QR on a phone screen.</p>
          </div>

          <div className="real-world-card poster-preview-card">
            <div className="poster-mockup">
              <div className="poster-content">
                <span className="poster-title">SCAN ME</span>

                {qrCode &&
                  (qrMode === "artistic" ? (
                    renderArtisticQR(beautyLevel, null)
                  ) : (
                    <img
                      src={qrCode}
                      alt="QR poster preview"
                      className="real-world-qr"
                    />
                  ))}

                <span className="poster-subtitle">Discover more</span>
              </div>
            </div>

            <h3>Poster</h3>
            <p>See your QR on a poster.</p>
          </div>

          <div className="real-world-card business-card-preview">
            <div className="business-card-mockup">
              <div className="business-card-info">
                <strong>QRay</strong>
                <span>Beautiful digital experiences</span>
              </div>

              {qrCode &&
                (qrMode === "artistic" ? (
                  renderArtisticQR(beautyLevel, null)
                ) : (
                  <img
                    src={qrCode}
                    alt="QR business card preview"
                    className="real-world-qr"
                  />
                ))}
            </div>

            <h3>Business Card</h3>
            <p>See your QR on a business card.</p>
          </div>

          <div className="real-world-card package-preview-card">
            <div className="package-mockup">
              <div className="package-label">
                <strong>QRay</strong>

                {qrCode &&
                  (qrMode === "artistic" ? (
                    renderArtisticQR(beautyLevel, null)
                  ) : (
                    <img
                      src={qrCode}
                      alt="QR package preview"
                      className="real-world-qr"
                    />
                  ))}

                <span>SCAN TO DISCOVER</span>
              </div>
            </div>

            <h3>Package</h3>
            <p>See your QR on packaging.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
