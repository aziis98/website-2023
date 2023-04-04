
import katex from "katex"
import { useEffect, useRef } from "preact/hooks"

export const InlineMath = ({ value }) => {
	const elRef = useRef()

	useEffect(() => {
		if (elRef.current) {
			katex.render(value.toString(), elRef.current, { throwOnError: false, displayMode: false })
		}
	}, [value])

	return <span ref={elRef} class="math-inline dynamic"></span>
}

export const DisplayMath = ({ value }) => {
	const elRef = useRef()

	useEffect(() => {
		if (elRef.current) {
			katex.render(value.toString(), elRef.current, { throwOnError: false, displayMode: true })
		}
	}, [value])

	return <span ref={elRef} class="math-display dynamic"></span>
}
