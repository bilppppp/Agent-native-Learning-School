// math-grade7 模型生成的数学实验观察脚本
// 运行方式：node public/activities/observe.mjs [case]

const cases = {
  temp: () => {
    const high = 3;
    const low = -3;
    const diff = high - low;
    console.log(`北京冬天气温：最高 ${high}℃，最低 ${low}℃`);
    console.log(`温差计算：${high} - (${low}) = ${diff}℃`);
    return { high, low, diff };
  },
  bill: () => {
    const transactions = [
      { name: "卖废品", amount: 3.5 },
      { name: "买圆珠笔", amount: -4.5 },
      { name: "买科普书", amount: -5.2 }
    ];
    let balance = 0;
    for (const t of transactions) {
      balance += t.amount;
      console.log(`${t.name}：${t.amount > 0 ? "+" : ""}${t.amount} 元，当前结余：${balance.toFixed(1)} 元`);
    }
    return balance;
  },
  stationery: (args = [3, 2]) => {
    const [pencilCount, bookCount] = args;
    const pencilPrice = 2; // 2元/支
    const bookPrice = 5;   // 5元/本
    const total = pencilCount * pencilPrice + bookCount * bookPrice;
    console.log(`文具总价整式：2a + 5b`);
    console.log(`当 a = ${pencilCount}, b = ${bookCount} 时，总价 = 2×${pencilCount} + 5×${bookCount} = ${total} 元`);
    return total;
  },
  balance: () => {
    console.log(`解方程实验：2x + 5 = 17`);
    console.log(`步骤 1（移项）：2x = 17 - 5`);
    console.log(`步骤 2（合并）：2x = 12`);
    console.log(`步骤 3（系数化为1）：x = 6`);
    console.log(`检验：2 × 6 + 5 = 17，天平平衡！`);
    return 6;
  },
  discount: () => {
    const cost = 100; // 进价 100 元
    const markup = 0.5; // 标价按 50% 利润，即 150 元
    const listPrice = cost * (1 + markup);
    const discountRate = 0.8; // 8折销售
    const salePrice = listPrice * discountRate;
    const profit = salePrice - cost;
    console.log(`进价：${cost} 元，标价：${listPrice} 元（加价50%）`);
    console.log(`打8折售价：${listPrice} × 0.8 = ${salePrice} 元`);
    console.log(`每件利润：${salePrice} - ${cost} = ${profit} 元`);
    return profit;
  }
};

const target = process.argv[2];
if (!target || !cases[target]) {
  console.log("可用观察案例：");
  console.log("  temp        - 观察温度差与负数减法");
  console.log("  bill        - 观察收支抵消与负数结余");
  console.log("  stationery  - 观察字母代数式与求值");
  console.log("  balance     - 观察天平移项与一元一次方程求解");
  console.log("  discount    - 观察购物进价、打折与利润方程模型");
} else {
  cases[target]();
}
