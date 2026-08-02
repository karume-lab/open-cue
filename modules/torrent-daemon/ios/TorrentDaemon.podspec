require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json'))) rescue {}
version = package['version'] || '1.0.0'

Pod::Spec.new do |s|
  s.name           = 'TorrentDaemon'
  s.version        = version
  s.summary        = 'A local expo module to run a Go torrent daemon'
  s.description    = s.summary
  s.homepage       = 'https://expo.dev'
  s.license        = 'MIT'
  s.author         = 'Author'
  s.platforms      = { :ios => '13.0' }
  s.swift_version  = '5.4'
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
  
  # Link the gomobile generated framework
  s.vendored_frameworks = 'Daemon.xcframework'
end
