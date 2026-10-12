const dummy = (blogs) => {
  return 1
}

const totalLikes = (blogs) => {
  const reducer = (sum, blog) => {
    return sum + blog.likes
  }

  return blogs.length === 0
    ? 0
    : blogs.reduce(reducer, 0)
}

const favoriteBlog = (blogs) => {
  if (blogs.length === 0) {
    return null
  }

  const reducer = (favorite, blog) => {
    return blog.likes > favorite.likes ? blog : favorite
  }

  const winner = blogs.reduce(reducer, blogs[0])

  return {
    title: winner.title,
    author: winner.author,
    likes: winner.likes
  }
}

const mostBlogs = (blogs) => {
  if (blogs.length === 0) {
    return null
  }

  const counts = {}

  blogs.forEach(blog => {
    counts[blog.author] = (counts[blog.author] || 0) + 1
  })

  let topAuthor = null
  let topCount = 0

  for (const author in counts) {
    if (counts[author] > topCount) {
      topAuthor = author
      topCount = counts[author]
    }
  }

  return {
    author: topAuthor,
    blogs: topCount
  }
}

const mostLikes = (blogs) => {
  if (blogs.length === 0) {
    return null
  }

  const likesByAuthor = {}

  blogs.forEach(blog => {
    likesByAuthor[blog.author] = (likesByAuthor[blog.author] || 0) + blog.likes
  })

  let topAuthor = null
  let topLikes = 0

  for (const author in likesByAuthor) {
    if (likesByAuthor[author] > topLikes) {
      topAuthor = author
      topLikes = likesByAuthor[author]
    }
  }

  return {
    author: topAuthor,
    likes: topLikes
  }
}

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
  mostBlogs,
  mostLikes
}