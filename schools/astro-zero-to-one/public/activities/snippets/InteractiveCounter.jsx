// src/components/InteractiveCounter.jsx
// 一个典型的 React 交互组件示例，用于演示 Astro 群岛水合指令
import { useState } from 'react';

export default function InteractiveCounter({ initialCount = 0 }) {
  const [count, setCount] = useState(initialCount);

  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <p>当前点击次数：{count}</p>
      <button onClick={() => setCount(count + 1)}>点击递增</button>
    </div>
  );
}
