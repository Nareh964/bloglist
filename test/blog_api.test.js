const assert = require('node:assert')
const { test, after, beforeEach } = require('node:test')
const mongoose = require('mongoose')
const supertest = require('supertest')
const bcrypt = require('bcrypt')
const app = require('../app')
const helper = require('./test_helper')
const Blog = require('../models/blog')
const User = require('../models/user')

const api = supertest(app)

let token = null
let rootUser = null

beforeEach(async () => {
  await Blog.deleteMany({})
  await User.deleteMany({})

  const passwordHash = await bcrypt.hash('sekret', 10)
  rootUser = await new User({ username: 'root', passwordHash }).save()

  const login = await api
    .post('/api/login')
    .send({ username: 'root', password: 'sekret' })
  token = login.body.token

  const blogs = helper.initialBlogs.map(b => ({ ...b, user: rootUser._id }))
  const saved = await Blog.insertMany(blogs)
  rootUser.blogs = saved.map(b => b._id)
  await rootUser.save()
})

test('blogs are returned as json', async () => {
  await api
    .get('/api/blogs')
    .expect(200)
    .expect('Content-Type', /application\/json/)
})

test('all blogs are returned', async () => {
  const response = await api.get('/api/blogs')
  assert.strictEqual(response.body.length, helper.initialBlogs.length)
})

test('blog posts have id property instead of _id', async () => {
  const response = await api.get('/api/blogs')

  response.body.forEach(blog => {
    assert.ok(blog.id)
    assert.strictEqual(blog._id, undefined)
  })
})

test('a valid blog can be added with a token', async () => {
  const newBlog = {
    title: 'Canonical string reduction',
    author: 'Edsger W. Dijkstra',
    url: 'http://www.cs.utexas.edu/~EWD/transcriptions/EWD08xx/EWD808.html',
    likes: 12,
  }

  await api
    .post('/api/blogs')
    .set('Authorization', `Bearer ${token}`)
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)

  const titles = blogsAtEnd.map(b => b.title)
  assert(titles.includes('Canonical string reduction'))
})

test('adding a blog fails with 401 if token is not provided', async () => {
  const newBlog = {
    title: 'No token blog',
    author: 'Nobody',
    url: 'http://example.com/no-token',
    likes: 1,
  }

  await api.post('/api/blogs').send(newBlog).expect(401)

  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
})

test('if likes is missing it defaults to 0', async () => {
  const newBlog = {
    title: 'Blog without likes',
    author: 'Test Author',
    url: 'http://example.com/no-likes',
  }

  const response = await api
    .post('/api/blogs')
    .set('Authorization', `Bearer ${token}`)
    .send(newBlog)
    .expect(201)

  assert.strictEqual(response.body.likes, 0)
})

test('blog without title is not added', async () => {
  const newBlog = {
    author: 'Test Author',
    url: 'http://example.com/no-title',
    likes: 3,
  }

  await api
    .post('/api/blogs')
    .set('Authorization', `Bearer ${token}`)
    .send(newBlog)
    .expect(400)

  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
})

test('blog without url is not added', async () => {
  const newBlog = {
    title: 'No url here',
    author: 'Test Author',
    likes: 3,
  }

  await api
    .post('/api/blogs')
    .set('Authorization', `Bearer ${token}`)
    .send(newBlog)
    .expect(400)

  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
})

test('a blog can be deleted by its creator', async () => {
  const blogsAtStart = await helper.blogsInDb()
  const blogToDelete = blogsAtStart[0]

  await api
    .delete(`/api/blogs/${blogToDelete.id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(204)

  const blogsAtEnd = await helper.blogsInDb()
  const ids = blogsAtEnd.map(b => b.id)
  assert(!ids.includes(blogToDelete.id))
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length - 1)
})

test('deleting without a token returns 401', async () => {
  const blogsAtStart = await helper.blogsInDb()

  await api.delete(`/api/blogs/${blogsAtStart[0].id}`).expect(401)

  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
})

test('deleting someone else\'s blog returns 403', async () => {
  const passwordHash = await bcrypt.hash('other', 10)
  await new User({ username: 'other', passwordHash }).save()
  const login = await api
    .post('/api/login')
    .send({ username: 'other', password: 'other' })

  const blogsAtStart = await helper.blogsInDb()

  await api
    .delete(`/api/blogs/${blogsAtStart[0].id}`)
    .set('Authorization', `Bearer ${login.body.token}`)
    .expect(403)

  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
})

test('deleting with a malformatted id returns 400', async () => {
  await api
    .delete('/api/blogs/12345')
    .set('Authorization', `Bearer ${token}`)
    .expect(400)
})

test('a blog likes can be updated', async () => {
  const blogsAtStart = await helper.blogsInDb()
  const blogToUpdate = blogsAtStart[0]

  const updatedData = { ...blogToUpdate, likes: blogToUpdate.likes + 1 }

  const response = await api
    .put(`/api/blogs/${blogToUpdate.id}`)
    .send(updatedData)
    .expect(200)
    .expect('Content-Type', /application\/json/)

  assert.strictEqual(response.body.likes, blogToUpdate.likes + 1)

  const blogsAtEnd = await helper.blogsInDb()
  const updatedInDb = blogsAtEnd.find(b => b.id === blogToUpdate.id)
  assert.strictEqual(updatedInDb.likes, blogToUpdate.likes + 1)
})

test('updating a non-existing blog returns 404', async () => {
  const id = await helper.nonExistingId()

  await api
    .put(`/api/blogs/${id}`)
    .send({ title: 'x', url: 'http://x.com', likes: 1 })
    .expect(404)
})

after(async () => {
  await mongoose.connection.close()
})