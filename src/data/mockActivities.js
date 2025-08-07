// src/data/mockActivities.js
export const mockActivities = [
  {
    id: '1',
    worksheet_level: '16382 L1 C1 B2',
    prompt: 'Tap all the cells that contain an odd number greater than 50. The sum of all selected numbers must be exactly 120.',
    status: 'Not Started',
    type: 'grid-numeric',
    gridData: [
      [23, 67, 89, 34, 12],
      [55, 91, 46, 73, 28],
      [39, 82, 57, 15, 64],
      [77, 41, 93, 26, 50],
      [18, 65, 32, 84, 59]
    ],
    solution: [[1, 1], [1, 2], [2, 2], [3, 0]] // Coordinates of correct answers
  },
  {
    id: '2',
    worksheet_level: '17834 L2 C3 A1',
    prompt: 'Select three numbers where the number in the thousands place is 4. The numbers must be sequential when read from left to right.',
    status: 'Not Started',
    type: 'grid-numeric',
    gridData: [
      [4123, 3456, 4789, 2341, 1456],
      [5678, 4321, 7890, 4567, 8901],
      [2345, 6789, 3456, 4890, 5432],
      [7654, 8765, 4234, 3210, 6543],
      [9876, 1234, 5678, 4345, 7890]
    ],
    solution: [[0, 0], [0, 2], [1, 1]] // Three numbers with 4 in thousands place
  },
  {
    id: '3',
    worksheet_level: '15221 L1 C2 B5',
    prompt: 'Find the greatest 5-digit number in the grid that has a 2 in the tens place.',
    status: 'Completed',
    type: 'grid-search',
    gridData: [
      [12345, 67829, 34521, 89123, 45627],
      [76321, 23456, 98725, 54329, 11223],
      [87629, 34521, 67829, 92123, 55627],
      [23456, 78923, 45621, 33329, 88725],
      [67829, 12345, 98729, 76521, 44623]
    ],
    solution: [[2, 4]] // Coordinates of the greatest number with 2 in tens place
  }
];

export const getActivityById = (id) => {
  return mockActivities.find(activity => activity.id === id);
};