let currentYear = new Date().getFullYear(); // Initialize the current year

function getNextStdNumber(currentNumber) {
  // If no number is given, or the year has changed, reset the counter
  if (
    !currentNumber ||
    parseInt(currentNumber.slice(0, 2), 10) !== currentYear % 100
  ) {
    currentYear = new Date().getFullYear();
    return `${currentYear.toString().slice(2)}00100001`;
  }

  // Extract the counter part (last 5 digits)
  const currentCounter = parseInt(currentNumber.slice(-5), 10);

  // Increment the counter
  const nextCounter = currentCounter + 1;

  // Generate the next number
  const nextNumber = `${currentYear.toString().slice(2)}001${nextCounter
    .toString()
    .padStart(5, "0")}`;

  return nextNumber;
}

export default getNextStdNumber;
