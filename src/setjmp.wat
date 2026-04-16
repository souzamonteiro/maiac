(module
	(import "env" "_setjmp_capture_js" (func $_setjmp_capture_js (param i32) (result i32)))
	(import "env" "_longjmp_unwind_js" (func $_longjmp_unwind_js (param i32 i32)))

	(func $setjmp (param $env i32) (result i32)
		local.get $env
		call $_setjmp_capture_js
	)

	(func $longjmp (param $env i32) (param $val i32) (result i32)
		local.get $env
		local.get $val
		i32.const 1
		local.get $val
		i32.const 0
		i32.ne
		select
		call $_longjmp_unwind_js
		unreachable
	)

	(export "setjmp" (func $setjmp))
	(export "longjmp" (func $longjmp))
)
