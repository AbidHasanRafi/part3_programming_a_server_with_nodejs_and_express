const express = require('express');
const app = express();
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const Person = require('./models/person');


const url = 'mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mongodb.net/phonebook?retryWrites=true&w=majority';
mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors());
app.use(express.json());
app.use(express.static('dist'));
app.use(morgan('tiny'));

const requestLogger = (request, response, next) => {
  console.log('Method:', request.method);
  console.log('Path:  ', request.path);
  console.log('Body:  ', request.body);
  console.log('---');
  next();
};
app.use(requestLogger);

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' });
};

app.get('/', (request, response) => {
  response.send('<h1>Hello World!</h1>');
});

app.get('/api/persons', async (request, response) => {
  const persons = await Person.find({});
  response.json(persons);
});

app.post('/api/persons', async (request, response) => {
  const body = request.body;

  if (!body.name || !body.number) {
    return response.status(400).json({ error: 'name or number missing' });
  }

  if (body.name.length < 3) {
    return response.status(400).json({ error: 'name must be at least 3 characters long' });
  }

  if (!/^\d{2,3}-\d+$/.test(body.number)) {
    return response.status(400).json({ error: 'invalid number format' });
  }

  const person = new Person({
    name: body.name,
    number: body.number,
  });

  const savedPerson = await person.save();
  response.json(savedPerson);
});

app.get('/api/persons/:id', async (request, response) => {
  const id = request.params.id;
  try {
    const person = await Person.findById(id);
    if (person) {
      response.json(person);
    } else {
      response.status(404).end();
    }
  } catch (error) {
    response.status(400).send({ error: 'malformatted id' });
  }
});

app.delete('/api/persons/:id', async (request, response) => {
  const id = request.params.id;
  await Person.findByIdAndDelete(id);
  response.status(204).end();
});

app.put('/api/persons/:id', async (request, response) => {
  const id = request.params.id;
  const body = request.body;

  if (!body.number || !/^\d{2,3}-\d+$/.test(body.number)) {
    return response.status(400).json({ error: 'invalid number format' });
  }

  try {
    const updatedPerson = await Person.findByIdAndUpdate(id, { number: body.number }, { new: true });
    response.json(updatedPerson);
  } catch (error) {
    response.status(400).send({ error: 'malformatted id' });
  }
});

app.use(unknownEndpoint);

app.use((error, request, response, next) => {
  console.error(error.message);
  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' });
  }
  next(error);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});