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

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog
}