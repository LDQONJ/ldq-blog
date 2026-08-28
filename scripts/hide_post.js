hexo.extend.filter.register("before_generate", function () {
  const targetGenerators = ["index", "archive", "category", "tag"];

  targetGenerators.forEach((name) => {
    const originalGenerator = hexo.extend.generator.get(name);
    if (!originalGenerator) return;

    hexo.extend.generator.register(name, function (locals) {
      // 过滤掉 hide 为 true 的文章，只将正常文章送入首页、归档、分类和标签
      const visiblePosts = locals.posts.filter((post) => !post.hide);
      const customLocals = Object.assign({}, locals, {
        posts: visiblePosts,
      });
      return originalGenerator.call(this, customLocals);
    });
  });
});
