
import React from 'react';
import { Student, Assignment, StudentStats } from './types';

export const COLORS = {
  primary: '#e16b6b',
  secondary: '#f3f4f6',
  accent: '#4ade80', // Green for charts
  text: '#1f2937',
  muted: '#9ca3af'
};

export const MOCK_STUDENTS: Student[] = [
  { id: '1', name: 'John Smith', course: 'Algebra I', period: 'Period 1', avatar: 'https://picsum.photos/seed/john/200' },
  { id: '2', name: 'Emily Johnson', course: 'Geometry', period: 'Period 2', avatar: 'https://picsum.photos/seed/emily/200' },
  { id: '3', name: 'Michael Brown', course: 'Algebra II', period: 'Period 3', avatar: 'https://picsum.photos/seed/mike/200' },
  { id: '4', name: 'Sarah Martinez', course: 'Pre-Calculus', period: 'Period 4', avatar: 'https://picsum.photos/seed/sarah/200' },
  { id: '5', name: 'Daniel Nguyen', course: 'Calculus AB', period: 'Period 5', avatar: 'https://picsum.photos/seed/dan/200' },
  { id: '6', name: 'Olivia Wilson', course: 'Statistics', period: 'Period 6', avatar: 'https://picsum.photos/seed/olivia/200' },
  { id: '7', name: 'James Anderson', course: 'Algebra I', period: 'Period 2' },
  { id: '8', name: 'Sophia Lee', course: 'Geometry', period: 'Period 3' },
  { id: '9', name: 'Ethan Rodriguez', course: 'Algebra II', period: 'Period 4' },
  { id: '10', name: 'Ava Thompson', course: 'Pre-Calculus', period: 'Period 1' },
];

export const MOCK_ASSIGNMENTS: Assignment[] = [
  { 
    id: 'hw1', 
    title: 'Linear Modeling & Real-World Applications', 
    description: 'Learn to represent real-life scenarios like taxi costs and gym memberships using linear equations.',
    type: 'Homework', 
    dueDate: 'Jan 12', 
    score: '100%',
    content: `Objective: Understand the relationship between variables in a linear context.

1. A taxi service charges a flat fee of $5 plus $2 per mile. Write a linear equation representing the cost (C) for a trip of (m) miles.
2. If a trip costs $25, how many miles was the journey? Show your calculation.
3. Graph the equation C = 2m + 5 on your digital scratchpad.
4. What does the y-intercept represent in the context of this problem?
5. What does the slope represent?`
  },
  { 
    id: 'hw2', 
    title: 'Mastering Linear Regression Analysis', 
    description: 'Practice calculating lines of best fit and understanding correlation versus causation.',
    type: 'Homework', 
    dueDate: 'Jan 19', 
    score: '95%',
    content: `Objective: Use the line of best fit to make predictions.

1. Given the data points (1,2), (2,4), (3,5), (4,8), calculate the approximate line of best fit manually.
2. Using the equation y = 1.9x + 0.5, predict the value of y when x = 10.
3. Explain the difference between interpolation and extrapolation.
4. Why might a high correlation (r-value) not necessarily imply causation? Give a real-world example.`
  },
  { 
    id: 'qz1', 
    title: 'Foundations of Data Literacy Quiz', 
    description: 'A comprehensive check on your understanding of categorical vs. numerical data and distribution measures.',
    type: 'Quiz', 
    dueDate: 'Jan 24', 
    score: '100%',
    content: `Data Literacy Quiz

Question 1: Define 'Categorical Data' and give three examples relevant to student demographics.
Question 2: What is the primary difference between a histogram and a bar chart?
Question 3: In a skewed distribution, which is usually a better measure of center: the Mean or the Median? Why?
Question 4: True or False: Outliers should always be deleted from a dataset before analysis.`
  },
  { 
    id: 'hw3', 
    title: 'Advanced Data Cleaning Techniques', 
    description: 'Deep dive into handling missing values, identifying outliers, and data normalization strategies.',
    type: 'Homework', 
    dueDate: 'Jan 31', 
    score: '100%',
    content: `Objective: Prepare a dataset for analysis.

1. List three common types of errors found in raw data.
2. How would you handle a missing 'Age' value in a survey of 1,000 people? Justify your choice (Mean substitution vs. Removal).
3. Convert the following date formats to ISO 8601 (YYYY-MM-DD): "Jan 5th, 2024", "12/01/24", "01-Feb-2024".
4. Describe the process of 'Normalization' and why it is important for comparative data.`
  },
  { 
    id: 'lab1', 
    title: 'Exploratory Analysis with Pandas', 
    description: 'An introductory lab session using Python Pandas to load, filter, and analyze student datasets.',
    type: 'Lab', 
    dueDate: 'Feb 2', 
    score: '100%',
    content: `Digital Lab Instructions

Step 1: Import the 'students.csv' dataset using df = pd.read_csv().
Step 2: Use df.head() to inspect the first 5 rows.
Step 3: Calculate the mean 'GPA' for all students.
Step 4: Filter the dataframe to show only students in 'Algebra II'.
Step 5: Export your results to a new CSV file named 'algebra_stats.csv'.

Reflection: What was the most challenging part of the syntax for you?`
  },
  { 
    id: 'pj1', 
    title: 'Research Proposal: Data in the Wild', 
    description: 'Develop a proposal for your final project, identifying a real-world dataset and core research question.',
    type: 'Project', 
    dueDate: 'Feb 7', 
    score: '98%',
    content: `Final Project Proposal

1. Topic Selection: Choose a real-world dataset you are interested in (e.g., Sports Stats, Climate Change, Stock Market).
2. Research Question: What specific question are you trying to answer?
3. Data Source: Provide a link to where you will get your data.
4. Methodology: Briefly describe how you plan to use regression or linear modeling to analyze this data.`
  },
  { 
    id: 'active1', 
    title: 'Practice: Multi-Step Linear Equations', 
    description: 'Reinforce your ability to solve complex equations involving parentheses and variables on both sides.',
    type: 'Homework', 
    dueDate: 'Next Week', 
    content: `
Directions: Solve each problem. Show your work.
1. x+6=14
2. 5y=35
3. 3a-4=11
4. n/3 + 5 = 9
5. 4x+7=2x+15
6. 2(y+3)=14
7. Three times a number minus 5 equals 16. Find the number.

Free Response — Explain
8. A student solved the equation 4x+6=18 by subtracting 6 from both sides, then dividing by 4. Explain why these steps keep the equation balanced and lead to the correct solution.` 
  }
];

export const MOCK_STATS: StudentStats = {
  understanding: 92,
  dependency: 55,
  engagement: 88,
  history: {
    understanding: [
      { week: 1, value: 65 }, { week: 2, value: 70 }, { week: 3, value: 78 },
      { week: 4, value: 82 }, { week: 5, value: 85 }, { week: 6, value: 92 }
    ],
    dependency: [
      { week: 1, value: 88 }, { week: 2, value: 82 }, { week: 3, value: 75 },
      { week: 4, value: 68 }, { week: 5, value: 60 }, { week: 6, value: 55 }
    ],
    engagement: [
      { week: 1, value: 70 }, { week: 2, value: 75 }, { week: 3, value: 82 },
      { week: 4, value: 80 }, { week: 5, value: 88 }, { week: 6, value: 95 }
    ]
  }
};
