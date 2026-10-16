import { useEffect, useState } from "react";
import { Button, Modal } from "animal-island-ui";

export default function IslandPromptNotice() {
	const [open, setOpen] = useState(false);
	const close = () => setOpen(false);

	useEffect(() => {
		const onCopied = () => setOpen(true);
		window.addEventListener("school:island-prompt-copied", onCopied);
		return () => window.removeEventListener("school:island-prompt-copied", onCopied);
	}, []);

	return (
		<Modal
			open={open}
			onClose={close}
			footer={
				<Button type="primary" onClick={close}>
					好的
				</Button>
			}
		>
			<span className="island-copy-line">提示词已经复制啦</span>
			<span className="island-copy-line">
				可以去 <span className="island-copy-mark">AI 工具</span> 里开始探索了...
			</span>
		</Modal>
	);
}
