typedef enum Mode {
  MODE_FAST,
  MODE_SAFE
} Mode;

struct Point {
  int x;
  int y;
};

(main)()
{
  int total = 0;
  int i = 0;

  while (i < 5) {
    total = total + i;
    i = i + 1;
  }

  if (total > 10) {
    total = total - 1;
  }

  switch (total) {
    case 10:
      total = total + 2;
      break;
    default:
      total = total + 3;
      break;
  }

  goto done;

done:
  return total;
}
