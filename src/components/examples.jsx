import { useState } from "preact/hooks";
import { DisplayMath, InlineMath } from "./Math";

export const ExampleCounter = ({ value, setValue }) => {
	return (
		<div className="counter">
			<button onClick={() => setValue((v) => v - 1)}>-</button>
			<InlineMath value={value} />
			<button onClick={() => setValue((v) => v + 1)}>+</button>
		</div>
	);
};

export const ExampleFraction = ({}) => {
	const [num, setNum] = useState(22);
	const [den, setDen] = useState(7);

	return (
		<div className="fraction">
			<ExampleCounter value={num} setValue={setNum} />
			<ExampleCounter
				value={den}
				setValue={(cb) =>
					setDen((d) => {
						const newD = cb(d);
						return newD > 0 ? newD : d;
					})
				}
			/>
			<DisplayMath value={String.raw`\frac{${num}}{${den}} \approx ${(num / den).toFixed(4)}`} />
		</div>
	);
};
