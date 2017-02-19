'use strict';

module.exports = function (grunt) {

  require('load-grunt-tasks')(grunt);
  require('time-grunt')(grunt);

  var libName = grunt.file.readJSON('bower.json').name;

  grunt.initConfig({

    paths: {
      src: {
        base: 'src'
      },
      dest: {
        base: 'dist',
        js: '<%= paths.dest.base %>/' + libName + '.js',
        jsMin: '<%= paths.dest.base %>/' + libName + '.min.js'
      },
      temp: {
        base: 'temp'
      }
    },

    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish'),
        reporterOutput: '',

      },
      all: {
        src: [
          'Gruntfile.js',
          '<%= paths.src.base %>/**/*.js'
        ]
      }
    },

    jsbeautifier: {
      options: {
        config: '.jsbeautifyrc'
      },
      all: {
        src: [
          'Gruntfile.js',
          '<%= paths.src.base %>/**/*.js'
        ]
      }
    },

    clean: {
      build: ['<%= paths.dest.base %>'],
      buildTemp: ['<%= paths.temp.base %>']
    },

    ngAnnotate: {
      options: {
        singleQuotes: true
      },
      build: {
        files: [{
          expand: true,
          cwd: '<%= paths.src.base %>',
          src: ['**/*.js'],
          dest: '<%= paths.temp.base %>'
        }]
      }
    },

    concat: {
      js: {
        options: {
          separator: ';\n',
        },
        src: [
          '<%= paths.temp.base %>' + '/app.js',
          '<%= paths.temp.base %>' + '/config/*.js',
          '<%= paths.temp.base %>' + '/filters/*.js',
          '<%= paths.temp.base %>' + '/directives/*.js',
          '<%= paths.temp.base %>' + '/services/*.js'
        ],
        dest: '<%= paths.dest.js %>'
      }
    },

    uglify: {
      options: {
        mangle: true,
        compress: true,
        sourceMap: true,
        preserveComments: false
      },
      build: {
        src: '<%= paths.dest.js %>',
        dest: '<%= paths.dest.jsMin %>'
      }
    }
  });

  grunt.registerTask('build', [
    'clean:build',
    'newer:jshint:all',
    'newer:jsbeautifier:all',
    'ngAnnotate:build',
    'concat:js',
    'uglify:build',
    'clean:buildTemp'
  ]);
};
