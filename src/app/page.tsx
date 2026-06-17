export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Decorative background elements */}
      <div style={{
        position: "absolute",
        top: "20%",
        left: "10%",
        width: "300px",
        height: "300px",
        background: "rgba(99, 102, 241, 0.2)",
        filter: "blur(100px)",
        borderRadius: "50%",
        zIndex: -1
      }} />
      <div style={{
        position: "absolute",
        bottom: "10%",
        right: "10%",
        width: "400px",
        height: "400px",
        background: "rgba(236, 72, 153, 0.15)",
        filter: "blur(100px)",
        borderRadius: "50%",
        zIndex: -1
      }} />

      <div className="glass-panel animate-float" style={{
        padding: "4rem",
        maxWidth: "800px",
        width: "100%",
        textAlign: "center",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}>
        <div style={{ marginBottom: "2rem", display: "inline-block" }}>
          <div style={{
            width: "80px",
            height: "80px",
            background: "var(--primary-glow)",
            borderRadius: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
            boxShadow: "0 10px 20px rgba(99, 102, 241, 0.3)"
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17H17M5 17V5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V17M5 17C3.89543 17 3 17.8954 3 19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19C21 17.8954 20.1046 17 19 17" />
            </svg>
          </div>
          <h1 className="premium-gradient-text" style={{ 
            fontSize: "4rem", 
            fontWeight: 700, 
            letterSpacing: "-0.02em",
            marginBottom: "1rem"
          }}>
            Take Seat
          </h1>
          <p style={{ 
            fontSize: "1.25rem", 
            color: "#94a3b8", 
            maxWidth: "600px", 
            margin: "0 auto 2.5rem",
            lineHeight: 1.6
          }}>
            智慧排位工具，輕鬆搞定婚宴、會議與各式活動的座位安排。
            <br />
            讓每一位嘉賓都賓至如歸。
          </p>
        </div>

        <div style={{ 
          display: "flex", 
          gap: "1.5rem", 
          justifyContent: "center",
          flexWrap: "wrap"
        }}>
          <a href="/seats" style={{
            padding: "1rem 2.5rem",
            borderRadius: "14px",
            background: "var(--foreground)",
            color: "var(--background)",
            fontWeight: 600,
            fontSize: "1.1rem",
            textDecoration: "none"
          }}>
            立即開始
          </a>
          <button className="glass-panel" style={{
            padding: "1rem 2.5rem",
            borderRadius: "14px",
            color: "var(--foreground)",
            fontWeight: 600,
            fontSize: "1.1rem",
            background: "rgba(255, 255, 255, 0.05)"
          }}>
            查看範例
          </button>
        </div>

        <div style={{ 
          marginTop: "4rem",
          display: "flex",
          justifyContent: "center",
          gap: "3rem",
          color: "#64748b",
          fontSize: "0.9rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "8px", height: "8px", background: "#22c55e", borderRadius: "50%" }} />
            智慧演算法
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "8px", height: "8px", background: "#6366f1", borderRadius: "50%" }} />
            視覺化編輯
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "8px", height: "8px", background: "#ec4899", borderRadius: "50%" }} />
            多平台同步
          </div>
        </div>
      </div>

      <footer style={{
        position: "absolute",
        bottom: "2rem",
        color: "#475569",
        fontSize: "0.85rem"
      }}>
        © 2026 Take Seat. Built with precision and care.
      </footer>
    </main>
  );
}
