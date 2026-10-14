const assert = require('node:assert')
const { test, after, beforeEach, describe } = require('node:test')
const mongoose = require('mongoose')
const supertest = require('supertest')
const bcrypt = require('bcrypt')
const app = require('../app')
const User = require('../models/user')

const api = supertest(app)

describe('creating users', () => {
  beforeEach(async () => {
    await User.deleteMany({})
    const passwordHash = await bcrypt.hash('sekret', 10)
    await new User({ username: 'root', passwordHash }).save()
  })

  test('succeeds with a fresh valid user', async () => {
    const newUser = { username: 'nareh', name: 'Nareh', password: 'salainen' }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await User.find({})
    assert.strictEqual(usersAtEnd.length, 2)
  })

  test('fails with 400 if username is taken', async () => {
    const newUser = { username: 'root', name: 'Dup', password: 'salainen' }

    const result = await api.post('/api/users').send(newUser).expect(400)

    assert(result.body.error.includes('unique'))
    assert.strictEqual((await User.find({})).length, 1)
  })

  test('fails with 400 if username is too short', async () => {
    const newUser = { username: 'ab', name: 'Short', password: 'salainen' }

    await api.post('/api/users').send(newUser).expect(400)

    assert.strictEqual((await User.find({})).length, 1)
  })

  test('fails with 400 if username is missing', async () => {
    await api.post('/api/users').send({ name: 'X', password: 'salainen' }).expect(400)

    assert.strictEqual((await User.find({})).length, 1)
  })

  test('fails with 400 if password is too short', async () => {
    const newUser = { username: 'validname', name: 'Pw', password: 'ab' }

    const result = await api.post('/api/users').send(newUser).expect(400)

    assert(result.body.error.includes('password'))
    assert.strictEqual((await User.find({})).length, 1)
  })

  test('fails with 400 if password is missing', async () => {
    await api.post('/api/users').send({ username: 'validname' }).expect(400)

    assert.strictEqual((await User.find({})).length, 1)
  })
})

after(async () => {
  await mongoose.connection.close()
})