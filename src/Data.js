const questions = [
    {
      id: 1,
      question: 'What is the capital of France?',
      options: ['Paris', 'London', 'Berlin', 'Rome'],
      correctAnswer: 'Paris',
    },
    {
      id: 2,
      question: 'Which planet is known as the Red Planet?',
      options: ['Earth', 'Mars', 'Jupiter', 'Saturn'],
      correctAnswer: 'Mars',
    },
    {
      id: 3,
      question: 'What is the largest ocean on Earth?',
      options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
      correctAnswer: 'Pacific Ocean',
    },
    {
      id: 4,
      question: 'Who painted the Mona Lisa?',
      options: ['Leonardo da Vinci', 'Vincent van Gogh', 'Pablo Picasso', 'Michelangelo'],
      correctAnswer: 'Leonardo da Vinci',
    },
    {
      id: 5,
      question: 'Which country is famous for the Great Wall?',
      options: ['Japan', 'China', 'India', 'Russia'],
      correctAnswer: 'China',
    },
    {
      id: 6,
      question: 'What is the currency of Japan?',
      options: ['Yen', 'Euro', 'Dollar', 'Pound'],
      correctAnswer: 'Yen',
    },
    {
      id: 7,
      question: 'Who wrote "Romeo and Juliet"?',
      options: ['William Shakespeare', 'Jane Austen', 'Charles Dickens', 'Emily Bronte'],
      correctAnswer: 'William Shakespeare',
    },
    {
      id: 8,
      question: 'Which planet is closest to the Sun?',
      options: ['Mars', 'Earth', 'Venus', 'Mercury'],
      correctAnswer: 'Mercury',
    },
    {
      id: 9,
      question: 'What is the tallest mountain in the world?',
      options: ['Mount Everest', 'K2', 'Kangchenjunga', 'Makalu'],
      correctAnswer: 'Mount Everest',
    },
    {
      id: 10,
      question: 'Which element has the chemical symbol "H"?',
      options: ['Helium', 'Hydrogen', 'Hassium', 'Hafnium'],
      correctAnswer: 'Hydrogen',
    },
    {
      id: 11,
      question: 'Who is known as the "Father of Computer Science"?',
      options: ['Bill Gates', 'Alan Turing', 'Steve Jobs', 'Tim Berners-Lee'],
      correctAnswer: 'Alan Turing',
    },
    {
      id: 12,
      question: 'Which country is famous for the Taj Mahal?',
      options: ['India', 'Turkey', 'Egypt', 'Iran'],
      correctAnswer: 'India',
    },
    {
      id: 13,
      question: 'What is the largest animal on Earth?',
      options: ['Giraffe', 'Elephant', 'Blue Whale', 'Hippopotamus'],
      correctAnswer: 'Blue Whale',
    },
    {
      id: 14,
      question: 'Who invented the telephone?',
      options: ['Alexander Graham Bell', 'Thomas Edison', 'Nikola Tesla', 'Albert Einstein'],
      correctAnswer: 'Alexander Graham Bell',
    },
    {
      id: 15,
      question: 'What is the official language of Brazil?',
      options: ['Spanish', 'Portuguese', 'French', 'Italian'],
      correctAnswer: 'Portuguese',
    },
    {
      id: 16,
      question: 'Who painted the Sistine Chapel ceiling?',
      options: ['Leonardo da Vinci', 'Raphael', 'Michelangelo', 'Donatello'],
      correctAnswer: 'Michelangelo',
    },
    {
      id: 17,
      question: 'What is the chemical symbol for gold?',
      options: ['Ag', 'Au', 'Fe', 'Pt'],
      correctAnswer: 'Au',
    },
    {
      id: 18,
      question: 'Which is the longest river in the world?',
      options: ['Amazon River', 'Nile River', 'Yangtze River', 'Mississippi River'],
      correctAnswer: 'Nile River',
    },
    {
      id: 19,
      question: 'Who wrote "To Kill a Mockingbird"?',
      options: ['Harper Lee', 'Mark Twain', 'Ernest Hemingway', 'F. Scott Fitzgerald'],
      correctAnswer: 'Harper Lee',
    },
    {
      id: 20,
      question: 'What year did the Titanic sink?',
      options: ['1912', '1923', '1901', '1935'],
      correctAnswer: '1912',
    },
    {
      id: 21,
      question: 'What is the smallest country in the world?',
      options: ['Monaco', 'San Marino', 'Liechtenstein', 'Vatican City'],
      correctAnswer: 'Vatican City',
    },
    {
      id: 22,
      question: 'Which planet has the most moons?',
      options: ['Earth', 'Mars', 'Jupiter', 'Saturn'],
      correctAnswer: 'Saturn',
    },
    {
      id: 23,
      question: 'What is the hardest natural substance on Earth?',
      options: ['Gold', 'Iron', 'Diamond', 'Platinum'],
      correctAnswer: 'Diamond',
    },
    {
      id: 24,
      question: 'Who discovered penicillin?',
      options: ['Alexander Fleming', 'Marie Curie', 'Louis Pasteur', 'Gregor Mendel'],
      correctAnswer: 'Alexander Fleming',
    },
    {
      id: 25,
      question: 'Which is the smallest planet in our solar system?',
      options: ['Earth', 'Venus', 'Mars', 'Mercury'],
      correctAnswer: 'Mercury',
    },
    {
      id: 26,
      question: 'Who was the first person to step on the Moon?',
      options: ['Yuri Gagarin', 'Buzz Aldrin', 'Neil Armstrong', 'Michael Collins'],
      correctAnswer: 'Neil Armstrong',
    },
    {
      id: 27,
      question: 'What is the capital city of Australia?',
      options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'],
      correctAnswer: 'Canberra',
    },
    {
      id: 28,
      question: 'Which country gifted the Statue of Liberty to the USA?',
      options: ['France', 'Germany', 'Spain', 'Italy'],
      correctAnswer: 'France',
    },
    {
      id: 29,
      question: 'Who is known as the "Father of Medicine"?',
      options: ['Hippocrates', 'Galen', 'Avicenna', 'Paracelsus'],
      correctAnswer: 'Hippocrates',
    },
    {
      id: 30,
      question: 'What is the longest bone in the human body?',
      options: ['Humerus', 'Femur', 'Tibia', 'Fibula'],
      correctAnswer: 'Femur',
    },
    {
      id: 31,
      question: 'Who wrote "1984"?',
      options: ['George Orwell', 'Aldous Huxley', 'Ray Bradbury', 'J.R.R. Tolkien'],
      correctAnswer: 'George Orwell',
    },
    {
      id: 32,
      question: 'What is the capital of Canada?',
      options: ['Toronto', 'Vancouver', 'Montreal', 'Ottawa'],
      correctAnswer: 'Ottawa',
    },
    {
      id: 33,
      question: 'Who invented the light bulb?',
      options: ['Thomas Edison', 'Nikola Tesla', 'Alexander Graham Bell', 'Guglielmo Marconi'],
      correctAnswer: 'Thomas Edison',
    },
    {
      id: 34,
      question: 'What is the most populous country in the world?',
      options: ['India', 'United States', 'Indonesia', 'China'],
      correctAnswer: 'China',
    },
    {
      id: 35,
      question: 'What is the chemical symbol for sodium?',
      options: ['Na', 'S', 'Sn', 'N'],
      correctAnswer: 'Na',
    },
    {
      id: 36,
      question: 'What is the main ingredient in guacamole?',
      options: ['Tomato', 'Onion', 'Avocado', 'Lime'],
      correctAnswer: 'Avocado',
    },
    {
      id: 37,
      question: 'Which country is the largest by area?',
      options: ['Canada', 'China', 'United States', 'Russia'],
      correctAnswer: 'Russia',
    },
    {
      id: 38,
      question: 'Who was the first president of the United States?',
      options: ['Thomas Jefferson', 'John Adams', 'George Washington', 'James Madison'],
      correctAnswer: 'George Washington',
    },
    {
      id: 39,
      question: 'What is the name of the longest river in South America?',
      options: ['Nile', 'Amazon', 'Yangtze', 'Mississippi'],
      correctAnswer: 'Amazon',
    },
    {
      id: 40,
      question: 'What is the chemical symbol for potassium?',
      options: ['P', 'K', 'Pt', 'Po'],
      correctAnswer: 'K',
    },
    {
      id: 41,
      question: 'Who painted "Starry Night"?',
      options: ['Vincent van Gogh', 'Claude Monet', 'Pablo Picasso', 'Leonardo da Vinci'],
      correctAnswer: 'Vincent van Gogh',
    },
    {
      id: 42,
      question: 'Which planet is known as the "Morning Star" or "Evening Star"?',
      options: ['Mars', 'Venus', 'Jupiter', 'Saturn'],
      correctAnswer: 'Venus',
    },
    {
      id: 43,
      question: 'Who developed the theory of relativity?',
      options: ['Isaac Newton', 'Albert Einstein', 'Galileo Galilei', 'Niels Bohr'],
      correctAnswer: 'Albert Einstein',
    },
    {
      id: 44,
      question: 'Which country is home to the kangaroo?',
      options: ['India', 'Australia', 'South Africa', 'Brazil'],
      correctAnswer: 'Australia',
    },
    {
      id: 45,
      question: 'What is the capital of Japan?',
      options: ['Beijing', 'Seoul', 'Bangkok', 'Tokyo'],
      correctAnswer: 'Tokyo',
    },
    {
      id: 46,
      question: 'Who wrote "The Odyssey"?',
      options: ['Homer', 'Virgil', 'Ovid', 'Sophocles'],
      correctAnswer: 'Homer',
    },
    {
      id: 47,
      question: 'What is the smallest continent?',
      options: ['Europe', 'Australia', 'Antarctica', 'South America'],
      correctAnswer: 'Australia',
    },
    {
      id: 48,
      question: 'What is the largest planet in our solar system?',
      options: ['Earth', 'Saturn', 'Neptune', 'Jupiter'],
      correctAnswer: 'Jupiter',
    },
    {
      id: 49,
      question: 'What is the capital of Italy?',
      options: ['Milan', 'Venice', 'Florence', 'Rome'],
      correctAnswer: 'Rome',
    },
    {
      id: 50,
      question: 'Which element has the chemical symbol "O"?',
      options: ['Oxygen', 'Osmium', 'Oganesson', 'Oxium'],
      correctAnswer: 'Oxygen',
    },
    {
      id: 51,
      question: 'Who is known as the "Father of Modern Physics"?',
      options: ['Isaac Newton', 'Albert Einstein', 'Niels Bohr', 'Galileo Galilei'],
      correctAnswer: 'Galileo Galilei',
    },
    {
      id: 52,
      question: 'Which city hosted the 2008 Summer Olympics?',
      options: ['London', 'Beijing', 'Athens', 'Sydney'],
      correctAnswer: 'Beijing',
    },
    {
      id: 53,
      question: 'What is the largest desert in the world?',
      options: ['Sahara', 'Arabian', 'Gobi', 'Antarctic'],
      correctAnswer: 'Antarctic',
    },
    {
      id: 54,
      question: 'What is the main ingredient in traditional Japanese miso soup?',
      options: ['Soybeans', 'Rice', 'Tofu', 'Fish'],
      correctAnswer: 'Soybeans',
    },
    {
      id: 55,
      question: 'Who wrote "Pride and Prejudice"?',
      options: ['Jane Austen', 'Emily Bronte', 'Charlotte Bronte', 'Mary Shelley'],
      correctAnswer: 'Jane Austen',
    },
    {
      id: 56,
      question: 'What is the chemical symbol for iron?',
      options: ['Ir', 'In', 'I', 'Fe'],
      correctAnswer: 'Fe',
    },
    {
      id: 57,
      question: 'What is the capital of Egypt?',
      options: ['Cairo', 'Alexandria', 'Giza', 'Luxor'],
      correctAnswer: 'Cairo',
    },
  ];
  
  module.exports={questions};